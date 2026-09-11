import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import {
  AuditPanel,
  GenomicsPanel,
  LabsPanel,
  MedicationsPanel,
  ReportsPanel,
  TrendsPanel,
} from '../features/dashboard/OperationalPanels';
import {
  LabReportEditorPanel,
  PdfViewerPanel,
  PrescriptionEditorPanel,
  type PdfViewerDocument,
} from '../features/dashboard/RoleEditors';
import {
  addPatientNote,
  fetchPatientRecord,
  isApiRequestError,
  recordAiDecision,
  saveLabReport,
  savePrescription,
  searchPatientRecords,
  subscribePatientRecord,
  syncPatientFromIntake,
  updatePatientField,
  type PatientSearchResult,
} from '../services/cloudPatientService';
import { buildClinicalPrescriptionAlert } from '../services/clinicalSafetyAlert';
import { buildLabRealtimeView } from '../services/labAIAgent';
import { TrendChart, type TrendSeries } from '../features/dashboard/TrendChart';
import { VitalsConsolePanel } from '../features/dashboard/VitalsConsolePanel';
import { useAuth } from '../state/authStore';
import { useIntake } from '../state/intakeStore';
import type { CloudFieldEdit, LabReportRecord } from '../types/domain';

const NAV_ITEMS = [
  { key: 'overview', label: 'Patient Overview', glyph: 'PO' },
  { key: 'vitals', label: 'Vitals', glyph: 'VI' },
  { key: 'labs', label: 'Labs', glyph: 'LB' },
  { key: 'genomics', label: 'Genomics', glyph: 'GN' },
  { key: 'medications', label: 'Medications', glyph: 'MD' },
  { key: 'prescription', label: 'Prescription Editor', glyph: 'RX' },
  { key: 'trends', label: 'Trends', glyph: 'TR' },
  { key: 'reports', label: 'Reports', glyph: 'RP' },
  { key: 'audit', label: 'Audit / Logs', glyph: 'AL' },
] as const;

const VITAL_CARDS = [
  { icon: 'T', label: 'Temperature', value: '98.6', unit: '°F' },
  { icon: 'BP', label: 'Blood Pressure', value: '120/80', unit: 'mmHg' },
  { icon: 'P', label: 'Pulse', value: '72', unit: 'bpm' },
  { icon: 'O₂', label: 'SpO₂', value: '98', unit: '%' },
  { icon: 'RR', label: 'Respiratory Rate', value: '16', unit: 'breaths/min' },
] as const;

type TrendScope = 'labs' | 'vitals' | 'medications' | 'genomics';
type RangeKey = '7d' | '30d' | '1y' | 'custom';
type DashboardPanel = (typeof NAV_ITEMS)[number]['key'];
const MAX_PDF_UPLOAD_BYTES = 15 * 1024 * 1024;
const LOCAL_REPORT_CACHE_PREFIX = 'pharmaco.local.reports.v1';
const LOCAL_CACHE_MAX_PDFS = 12;
const LOCAL_CACHE_MAX_LABS = 30;
const LOCAL_CACHE_DB_NAME = 'pharmaco.local.cache.db.v1';
const LOCAL_CACHE_DB_STORE = 'reportArtifacts';

interface DashboardLabArtifact extends LabReportRecord {
  values: Array<{ name: string; value: string; reference: string }>;
}

interface LocalReportCachePayload {
  pdfDocuments: PdfViewerDocument[];
  labReports: DashboardLabArtifact[];
}

interface IndexedReportCacheRecord extends LocalReportCachePayload {
  cacheKey: string;
  updatedAt: string;
}

function mergePdfDocuments(primary: PdfViewerDocument[], secondary: PdfViewerDocument[]): PdfViewerDocument[] {
  const combined = [...primary, ...secondary].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  const seen = new Set<string>();

  return combined
    .filter((document) => {
      if (!document.id || seen.has(document.id)) {
        return false;
      }

      seen.add(document.id);
      return true;
    })
    .slice(0, LOCAL_CACHE_MAX_PDFS);
}

function mergeLabReportArtifacts(primary: DashboardLabArtifact[], secondary: DashboardLabArtifact[]): DashboardLabArtifact[] {
  const combined = [...primary, ...secondary].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  const seen = new Set<string>();

  return combined
    .filter((report) => {
      if (!report.id || seen.has(report.id)) {
        return false;
      }

      seen.add(report.id);
      return true;
    })
    .slice(0, LOCAL_CACHE_MAX_LABS);
}

function normalizeCachedPdfDocuments(rawDocuments: unknown[]): PdfViewerDocument[] {
  const mapped: Array<PdfViewerDocument | null> = rawDocuments.map((entryRaw): PdfViewerDocument | null => {
    const entry = (entryRaw ?? {}) as Record<string, unknown>;
    const id = typeof entry?.id === 'string' ? entry.id.trim() : '';
    const title = typeof entry?.title === 'string' ? entry.title.trim() : '';
    const url = typeof entry?.url === 'string' ? entry.url.trim() : '';
    const createdAt = typeof entry?.createdAt === 'string' ? entry.createdAt : new Date().toISOString();
    const owner = typeof entry?.owner === 'string' ? entry.owner : 'Authorized Staff';
    const source = entry?.source === 'uploaded' ? 'uploaded' : 'generated';
    const reportKind =
      entry?.reportKind === 'prescription' || entry?.reportKind === 'lab_report' || entry?.reportKind === 'uploaded_lab'
        ? entry.reportKind
        : undefined;
    const linkedReportId = typeof entry?.linkedReportId === 'string' ? entry.linkedReportId : undefined;

    if (!id || !title || !url.startsWith('data:application/pdf')) {
      return null;
    }

    return {
      id,
      title,
      url,
      createdAt,
      owner,
      source,
      reportKind,
      linkedReportId,
    };
  });

  return mergePdfDocuments(
    mapped.filter((entry): entry is PdfViewerDocument => entry !== null),
    [],
  );
}

function normalizeCachedLabReports(rawReports: unknown[], patientId: string): DashboardLabArtifact[] {
  const mapped: Array<DashboardLabArtifact | null> = rawReports.map((entryRaw): DashboardLabArtifact | null => {
    const entry = (entryRaw ?? {}) as Record<string, unknown>;
    const id = typeof entry?.id === 'string' ? entry.id.trim() : '';
    const title = typeof entry?.title === 'string' ? entry.title.trim() : '';
    const findings = typeof entry?.findings === 'string' ? entry.findings.trim() : '';
    const sourceType = entry?.sourceType === 'pdf' ? 'pdf' : 'structured';
    const aiSummary = typeof entry?.aiSummary === 'string' ? entry.aiSummary : '';
    const createdAt = typeof entry?.createdAt === 'string' ? entry.createdAt : new Date().toISOString();
    const createdBy = typeof entry?.createdBy === 'string' ? entry.createdBy : 'Lab Technician';
    const values = Array.isArray(entry?.values)
      ? entry.values.map((row: { name?: unknown; value?: unknown; reference?: unknown }) => ({
          name: String(row?.name || 'Marker'),
          value: String(row?.value || 'N/A'),
          reference: String(row?.reference || 'N/A'),
        }))
      : [];

    if (!id || !title || !findings) {
      return null;
    }

    return {
      id,
      patientId,
      title,
      sourceType,
      findings,
      values,
      aiSummary,
      createdAt,
      createdBy,
    };
  });

  return mergeLabReportArtifacts(
    mapped.filter((entry): entry is DashboardLabArtifact => entry !== null),
    [],
  );
}

function readLocalReportCache(cacheKey: string, patientId: string): { pdfDocuments: PdfViewerDocument[]; labReports: DashboardLabArtifact[] } {
  if (typeof window === 'undefined') {
    return { pdfDocuments: [], labReports: [] };
  }

  try {
    const raw = window.localStorage.getItem(cacheKey);
    if (!raw) {
      return { pdfDocuments: [], labReports: [] };
    }

    const parsed = JSON.parse(raw) as {
      pdfDocuments?: unknown[];
      labReports?: unknown[];
    };

    return {
      pdfDocuments: normalizeCachedPdfDocuments(Array.isArray(parsed?.pdfDocuments) ? parsed.pdfDocuments : []),
      labReports: normalizeCachedLabReports(Array.isArray(parsed?.labReports) ? parsed.labReports : [], patientId),
    };
  } catch {
    return { pdfDocuments: [], labReports: [] };
  }
}

async function openLocalReportCacheDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return null;
  }

  return new Promise((resolve) => {
    const request = window.indexedDB.open(LOCAL_CACHE_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(LOCAL_CACHE_DB_STORE)) {
        db.createObjectStore(LOCAL_CACHE_DB_STORE, { keyPath: 'cacheKey' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      resolve(null);
    };
  });
}

async function readIndexedReportCache(cacheKey: string, patientId: string): Promise<LocalReportCachePayload> {
  const db = await openLocalReportCacheDatabase();
  if (!db) {
    return { pdfDocuments: [], labReports: [] };
  }

  return new Promise((resolve) => {
    const tx = db.transaction(LOCAL_CACHE_DB_STORE, 'readonly');
    const store = tx.objectStore(LOCAL_CACHE_DB_STORE);
    const request = store.get(cacheKey);

    request.onsuccess = () => {
      const rawRecord = request.result as Partial<IndexedReportCacheRecord> | undefined;
      resolve({
        pdfDocuments: normalizeCachedPdfDocuments(Array.isArray(rawRecord?.pdfDocuments) ? rawRecord.pdfDocuments : []),
        labReports: normalizeCachedLabReports(Array.isArray(rawRecord?.labReports) ? rawRecord.labReports : [], patientId),
      });
    };

    request.onerror = () => {
      resolve({ pdfDocuments: [], labReports: [] });
    };

    tx.oncomplete = () => {
      db.close();
    };

    tx.onerror = () => {
      db.close();
      resolve({ pdfDocuments: [], labReports: [] });
    };
  });
}

async function writeIndexedReportCache(cacheKey: string, payload: LocalReportCachePayload): Promise<void> {
  const db = await openLocalReportCacheDatabase();
  if (!db) {
    return;
  }

  await new Promise<void>((resolve) => {
    const tx = db.transaction(LOCAL_CACHE_DB_STORE, 'readwrite');
    const store = tx.objectStore(LOCAL_CACHE_DB_STORE);

    store.put({
      cacheKey,
      updatedAt: new Date().toISOString(),
      pdfDocuments: payload.pdfDocuments.slice(0, LOCAL_CACHE_MAX_PDFS),
      labReports: payload.labReports.slice(0, LOCAL_CACHE_MAX_LABS),
    } satisfies IndexedReportCacheRecord);

    tx.oncomplete = () => {
      db.close();
      resolve();
    };

    tx.onerror = () => {
      db.close();
      resolve();
    };
  });
}

function writeLocalReportCache(
  cacheKey: string,
  payload: { pdfDocuments: PdfViewerDocument[]; labReports: DashboardLabArtifact[] },
): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      cacheKey,
      JSON.stringify({
        pdfDocuments: payload.pdfDocuments.slice(0, LOCAL_CACHE_MAX_PDFS),
        labReports: payload.labReports.slice(0, LOCAL_CACHE_MAX_LABS),
      }),
    );
  } catch {
    // Ignore local storage quota errors.
  }
}

const RANGE_LABELS: Record<RangeKey, string> = {
  '7d': '7 Days',
  '30d': '30 Days',
  '1y': '1 Year',
  custom: 'Custom',
};

const TIMELINES: Record<RangeKey, string[]> = {
  '7d': ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'],
  '30d': ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'],
  '1y': ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'],
  custom: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
};

function toNumericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.includes('/')) {
    const [first] = normalized.split('/');
    const fromFraction = Number(first);
    return Number.isFinite(fromFraction) ? fromFraction : null;
  }

  const stripped = normalized.replace(/[^0-9.-]/g, '');
  const parsed = Number(stripped);
  return Number.isFinite(parsed) ? parsed : null;
}

function readNumericField(fields: Record<string, unknown>, key: string, fallback: number): number {
  const parsed = toNumericValue(fields[key]);
  return parsed === null ? fallback : parsed;
}

function historicalSeriesPoints(labels: string[], fieldKey: string, currentValue: number, edits: CloudFieldEdit[]) {
  const historicalValues = edits
    .filter((entry) => entry.fieldKey === fieldKey)
    .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime())
    .map((entry) => toNumericValue(entry.value))
    .filter((value): value is number => value !== null);

  const requiredHistory = Math.max(0, labels.length - 1);
  const tailHistory = historicalValues.slice(-requiredHistory);
  const values = [...tailHistory, currentValue];

  while (values.length < labels.length) {
    values.unshift(values[0] ?? currentValue);
  }

  return labels.map((label, index) => ({
    label,
    value: Number((values[index] ?? currentValue).toFixed(2)),
  }));
}

function buildSeries(range: RangeKey, scope: TrendScope, fields: Record<string, unknown>, edits: CloudFieldEdit[], variantCount: number): TrendSeries[] {
  const labels = TIMELINES[range];

  if (scope === 'labs') {
    const wbcBaseline = readNumericField(fields, 'labs_wbcBaseline', 6900);
    const rbcBaseline = readNumericField(fields, 'labs_rbcBaseline', 5.05);
    const currentWbc = readNumericField(fields, 'labs_wbc', 7600 + Math.round(variantCount * 12));
    const currentRbc = readNumericField(fields, 'labs_rbc', Number(Math.max(3.8, 5.1 - variantCount / 400).toFixed(2)));
    const wbcPoints = historicalSeriesPoints(labels, 'labs_wbc', currentWbc, edits);
    const rbcPoints = historicalSeriesPoints(labels, 'labs_rbc', currentRbc, edits);

    return [
      {
        key: 'wbc-live',
        name: 'WBC',
        colorClass: 'series-teal',
        mode: 'realtime',
        riskPointIndexes: wbcPoints.map((point, index) => (point.value > wbcBaseline * 1.08 ? index : -1)).filter((index) => index >= 0),
        points: wbcPoints,
      },
      {
        key: 'wbc-historical',
        name: 'WBC Baseline',
        colorClass: 'series-teal-soft',
        mode: 'historical',
        points: labels.map((label) => ({ label, value: Number(wbcBaseline.toFixed(2)) })),
      },
      {
        key: 'rbc-live',
        name: 'RBC',
        colorClass: 'series-blue',
        mode: 'realtime',
        riskPointIndexes: rbcPoints.map((point, index) => (point.value < rbcBaseline * 0.98 ? index : -1)).filter((index) => index >= 0),
        points: rbcPoints,
      },
      {
        key: 'rbc-historical',
        name: 'RBC Baseline',
        colorClass: 'series-blue-soft',
        mode: 'historical',
        points: labels.map((label) => ({ label, value: Number(rbcBaseline.toFixed(2)) })),
      },
    ];
  }

  if (scope === 'vitals') {
    const pulseBaseline = readNumericField(fields, 'vitals_pulseBaseline', 70);
    const spo2Baseline = readNumericField(fields, 'vitals_spo2Baseline', 97.5);
    const pulse = readNumericField(fields, 'vitals_pulse', 72);
    const spo2 = readNumericField(fields, 'vitals_spo2', 98);
    const pulsePoints = historicalSeriesPoints(labels, 'vitals_pulse', pulse, edits);
    const spo2Points = historicalSeriesPoints(labels, 'vitals_spo2', spo2, edits);

    return [
      {
        key: 'pulse-live',
        name: 'Pulse',
        colorClass: 'series-teal',
        mode: 'realtime',
        riskPointIndexes: pulsePoints.map((point, index) => (point.value > 100 ? index : -1)).filter((index) => index >= 0),
        points: pulsePoints,
      },
      {
        key: 'pulse-historical',
        name: 'Pulse Baseline',
        colorClass: 'series-teal-soft',
        mode: 'historical',
        points: labels.map((label) => ({ label, value: Number(pulseBaseline.toFixed(2)) })),
      },
      {
        key: 'spo2-live',
        name: 'SpO₂',
        colorClass: 'series-blue',
        mode: 'realtime',
        riskPointIndexes: spo2Points.map((point, index) => (point.value < 94 ? index : -1)).filter((index) => index >= 0),
        points: spo2Points,
      },
      {
        key: 'spo2-historical',
        name: 'SpO₂ Baseline',
        colorClass: 'series-blue-soft',
        mode: 'historical',
        points: labels.map((label) => ({ label, value: Number(spo2Baseline.toFixed(2)) })),
      },
    ];
  }

  if (scope === 'medications') {
    return [
      {
        key: 'response-live',
        name: 'Therapeutic Response',
        colorClass: 'series-teal',
        mode: 'realtime',
        riskPointIndexes: [3, 4, 5],
        points: labels.map((label, index) => ({ label, value: [61, 66, 70, 74, 76, 79][index] ?? 79 })),
      },
      {
        key: 'response-historical',
        name: 'Pre-change Baseline',
        colorClass: 'series-teal-soft',
        mode: 'historical',
        points: labels.map((label) => ({ label, value: 63 })),
      },
    ];
  }

  return [
    {
      key: 'geno-live',
      name: 'Genomic Risk Index',
      colorClass: 'series-blue',
      mode: 'realtime',
      riskPointIndexes: [2, 3],
      points: labels.map((label, index) => ({ label, value: [0.42, 0.44, 0.46, 0.49, 0.47, 0.45][index] ?? 0.45 })),
    },
    {
      key: 'geno-historical',
      name: 'Genomic Baseline',
      colorClass: 'series-blue-soft',
      mode: 'historical',
      points: labels.map((label) => ({ label, value: 0.43 })),
    },
  ];
}

function roleLabel(rawRole: string | null, isDemoMode: boolean): string {
  if (isDemoMode) {
    return 'Demo Mode';
  }

  if (!rawRole) {
    return 'Unknown Role';
  }

  if (rawRole === 'lab_technician') {
    return 'Lab Technician';
  }

  return rawRole.charAt(0).toUpperCase() + rawRole.slice(1);
}

function buildPdfDocument(
  title: string,
  fileName: string,
  rows: Array<{ label: string; value: string }>,
  owner: string,
): PdfViewerDocument {
  const document = new jsPDF({ unit: 'pt', format: 'a4' });
  const createdAt = new Date().toISOString();

  const marginX = 48;
  const maxWidth = document.internal.pageSize.getWidth() - marginX * 2;
  let cursorY = 58;

  document.setFont('helvetica', 'bold');
  document.setFontSize(15);
  document.text(title, marginX, cursorY);

  cursorY += 18;
  document.setFont('helvetica', 'normal');
  document.setFontSize(10);
  document.text(`Generated: ${new Date(createdAt).toLocaleString()} · Owner: ${owner}`, marginX, cursorY);

  cursorY += 20;

  rows.forEach((row) => {
    const block = `${row.label}: ${row.value}`;
    const wrapped = document.splitTextToSize(block, maxWidth);
    wrapped.forEach((line: string) => {
      if (cursorY > document.internal.pageSize.getHeight() - 42) {
        document.addPage();
        cursorY = 48;
      }

      document.text(String(line), marginX, cursorY);
      cursorY += 14;
    });

    cursorY += 6;
  });

  const url = document.output('datauristring');
  document.save(fileName);

  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    url,
    createdAt,
    owner,
    source: 'generated',
  };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result.startsWith('data:application/pdf')) {
        reject(new Error('Only PDF files are supported.'));
        return;
      }

      resolve(result);
    };
    reader.onerror = () => reject(new Error('Unable to read the selected PDF file.'));
    reader.readAsDataURL(file);
  });
}

function triggerPdfDownload(dataUrl: string, fileName: string): void {
  if (typeof document === 'undefined' || !dataUrl.startsWith('data:application/pdf')) {
    return;
  }

  const safeName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = safeName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function DashboardPage() {
  const [scope, setScope] = useState<TrendScope>('labs');
  const [range, setRange] = useState<RangeKey>('30d');
  const [activePanel, setActivePanel] = useState<DashboardPanel>('overview');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, signOut, role, hospital, isDemoMode, can } = useAuth();
  const { getOutputByPatient } = useIntake();
  const pdfUrlsRef = useRef<string[]>([]);
  const [cloudRecord, setCloudRecord] = useState<{
    hospitalId?: string;
    fields: Record<string, unknown>;
    edits: Array<{
      fieldKey: string;
      value: unknown;
      editedBy: string;
      editorEmail: string;
      note: string;
      timestamp: string;
    }>;
    notes: Array<{
      text: string;
      author: string;
      authorEmail: string;
      timestamp: string;
    }>;
    auditLogs?: Array<{
      user_id: string;
      role: string;
      hospital_id?: string;
      patient_id: string;
      action: string;
      ai_suggestion: string;
      final_decision: string;
      timestamp: string;
      justification: string;
    }>;
  } | null>(null);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [queueActionStatus, setQueueActionStatus] = useState<string | null>(null);
  const [isQueueActionSaving, setIsQueueActionSaving] = useState(false);
  const [isPrescriptionSaving, setIsPrescriptionSaving] = useState(false);
  const [isLabReportSaving, setIsLabReportSaving] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [patientSearchResults, setPatientSearchResults] = useState<PatientSearchResult[]>([]);
  const [patientSearchError, setPatientSearchError] = useState<string | null>(null);
  const [pdfDocuments, setPdfDocuments] = useState<PdfViewerDocument[]>([]);
  const [selectedPdfId, setSelectedPdfId] = useState<string | null>(null);
  const [localPdfDocuments, setLocalPdfDocuments] = useState<PdfViewerDocument[]>([]);
  const [localLabReports, setLocalLabReports] = useState<DashboardLabArtifact[]>([]);
  const [isLocalCacheReady, setIsLocalCacheReady] = useState(false);

  const canEditVitals = can('vitals:edit');
  const canEditNonMedication = can('nonMedication:edit');
  const canAddNotes = can('notes:edit');
  const canEditMedication = can('medication:edit');
  const canEditPrescription = can('prescription:edit');
  const canEditLab = can('lab:edit');
  const canUploadLab = can('lab:upload');
  const canUploadVcf = can('upload:vcf');
  const roleDisplay = roleLabel(role, isDemoMode);

  const availableNavItems = useMemo(
    () =>
      NAV_ITEMS.filter((item) => {
        if (item.key === 'prescription') {
          return canEditPrescription || isDemoMode;
        }

        if (item.key === 'medications') {
          return role !== 'lab_technician' || isDemoMode;
        }

        return true;
      }),
    [canEditPrescription, isDemoMode, role],
  );

  const staffName = user?.display_name ?? 'Authorized Staff';
  const staffInitials = staffName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  const patientId = searchParams.get('patientId')?.trim() || 'PT-2041';
  const patientOutput = getOutputByPatient(patientId);
  const localReportCacheKey = `${LOCAL_REPORT_CACHE_PREFIX}.${hospital?.hospital_id ?? 'GLOBAL'}.${patientId}`;
  const cloudFields = cloudRecord?.fields ?? {};
  const fieldString = (fieldKey: string, fallback: string) => {
    const value = cloudFields[fieldKey];
    return value === undefined || value === null ? fallback : String(value);
  };
  const fieldNumber = (fieldKey: string, fallback: number) => {
    const value = cloudFields[fieldKey];
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : fallback;
    }

    return fallback;
  };

  const variantCount = fieldNumber('variantCount', patientOutput?.quality_metrics.variant_line_count ?? 58);
  const severityRaw = fieldString('severity', patientOutput?.risk_assessment.severity ?? 'high').toLowerCase();
  const severity = severityRaw === 'critical' || severityRaw === 'moderate' ? severityRaw : 'high';
  const severityLabel = severity.charAt(0).toUpperCase() + severity.slice(1);
  const confidence = fieldNumber('confidence', patientOutput?.risk_assessment.confidence_score ?? 0.92);
  const primaryGene = fieldString('primaryGene', patientOutput?.pharmacogenomic_profile.primary_gene ?? 'GENE_SYMBOL');
  const phenotype = fieldString('phenotype', patientOutput?.pharmacogenomic_profile.phenotype ?? 'RM');
  const diplotype = fieldString('diplotype', patientOutput?.pharmacogenomic_profile.diplotype ?? '*x/*y');
  const riskLabel = fieldString('riskLabel', patientOutput?.risk_assessment.risk_label ?? 'Toxic Interaction Risk');
  const verdictHeadline =
    severity === 'critical'
      ? `${riskLabel.toUpperCase()} — ACTION REQUIRED`
      : severity === 'high'
        ? `${riskLabel.toUpperCase()} — REVIEW REQUIRED`
        : `${riskLabel.toUpperCase()} — CONTROLLED REVIEW`;
  const verdictAction = fieldString('verdictAction', patientOutput?.clinical_recommendation.action ?? 'Immediate Review Required');
  const outputTimestamp = fieldString(
    'sourceTimestamp',
    patientOutput?.timestamp ? new Date(patientOutput.timestamp).toLocaleString() : '2026-02-19 09:42',
  );
  const trendSeries = useMemo(
    () => buildSeries(range, scope, cloudFields, cloudRecord?.edits ?? [], variantCount),
    [cloudFields, cloudRecord?.edits, range, scope, variantCount],
  );

  useEffect(() => {
    setSearchInput(patientId);
  }, [patientId]);

  useEffect(() => {
    const query = searchInput.trim();
    if (!query) {
      setPatientSearchResults([]);
      setPatientSearchError(null);
      setIsSearchingPatients(false);
      return;
    }

    let active = true;
    setIsSearchingPatients(true);

    const timer = window.setTimeout(async () => {
      try {
        const results = await searchPatientRecords(query, 8);
        if (!active) {
          return;
        }

        setPatientSearchResults(results);
        setPatientSearchError(null);
      } catch {
        if (!active) {
          return;
        }

        setPatientSearchResults([]);
        setPatientSearchError('Unable to query patient records right now.');
      } finally {
        if (active) {
          setIsSearchingPatients(false);
        }
      }
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    setIsLocalCacheReady(false);
    setLocalPdfDocuments([]);
    setLocalLabReports([]);

    const cached = readLocalReportCache(localReportCacheKey, patientId);
    setLocalPdfDocuments(cached.pdfDocuments);
    setLocalLabReports(cached.labReports);

    void readIndexedReportCache(localReportCacheKey, patientId).then((indexed) => {
      if (!active) {
        return;
      }

      setLocalPdfDocuments((current) => mergePdfDocuments(indexed.pdfDocuments, current));
      setLocalLabReports((current) => mergeLabReportArtifacts(indexed.labReports, current));
      setIsLocalCacheReady(true);
    });

    return () => {
      active = false;
    };
  }, [localReportCacheKey, patientId]);

  useEffect(() => {
    if (!isLocalCacheReady) {
      return;
    }

    const cachePayload: LocalReportCachePayload = {
      pdfDocuments: localPdfDocuments,
      labReports: localLabReports,
    };

    writeLocalReportCache(localReportCacheKey, cachePayload);
    void writeIndexedReportCache(localReportCacheKey, cachePayload);
  }, [isLocalCacheReady, localLabReports, localPdfDocuments, localReportCacheKey]);

  useEffect(() => {
    if (!availableNavItems.some((item) => item.key === activePanel)) {
      setActivePanel('overview');
    }
  }, [activePanel, availableNavItems]);

  useEffect(() => {
    pdfUrlsRef.current = pdfDocuments.map((document) => document.url).filter((url) => url.startsWith('blob:'));
  }, [pdfDocuments]);

  useEffect(() => {
    if (!pdfDocuments.length) {
      if (selectedPdfId !== null) {
        setSelectedPdfId(null);
      }

      return;
    }

    if (!selectedPdfId || !pdfDocuments.some((document) => document.id === selectedPdfId)) {
      setSelectedPdfId(pdfDocuments[0].id);
    }
  }, [pdfDocuments, selectedPdfId]);

  useEffect(
    () => () => {
      pdfUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  const selectedPdfDocument = useMemo(
    () => pdfDocuments.find((document) => document.id === selectedPdfId) ?? pdfDocuments[0] ?? null,
    [pdfDocuments, selectedPdfId],
  );

  const openPatient = (candidateId: string) => {
    const normalized = candidateId.trim();
    if (!normalized) {
      return;
    }

    navigate(`/dashboard?patientId=${encodeURIComponent(normalized)}`);
  };

  useEffect(() => {
    let active = true;

    const initializeRecord = async () => {
      try {
        const existing = await fetchPatientRecord(patientId);
        if (existing) {
          if (active) {
            setCloudRecord({
              hospitalId: existing.hospitalId,
              fields: existing.fields,
              edits: existing.edits,
              notes: existing.notes,
              auditLogs: existing.auditLogs,
            });
            setCloudError(null);
          }

          return;
        }

        if (!canUploadVcf || !patientOutput) {
          if (active) {
            setCloudRecord(null);
            setCloudError(null);
          }

          return;
        }

        const synced = await syncPatientFromIntake(patientId, patientOutput ?? null);
        if (active) {
          setCloudRecord({
            hospitalId: synced.hospitalId,
            fields: synced.fields,
            edits: synced.edits,
            notes: synced.notes,
            auditLogs: synced.auditLogs,
          });
          setCloudError(null);
        }
      } catch (error) {
        if (active) {
          if (isApiRequestError(error) && error.status === 403) {
            setCloudError('Role does not allow genomic intake sync from dashboard. Showing read-only/local values.');
            return;
          }

          if (isApiRequestError(error) && error.status === 503) {
            setCloudError('Cloud database temporarily unavailable. Displaying local fallback values.');
            return;
          }

          setCloudError('Cloud data source unavailable. Displaying local fallback values.');
        }
      }
    };

    initializeRecord();

    const unsubscribe = subscribePatientRecord(patientId, (record) => {
      if (!active || !record) {
        return;
      }

      setCloudRecord({
        hospitalId: record.hospitalId,
        fields: record.fields,
        edits: record.edits,
        notes: record.notes,
        auditLogs: record.auditLogs,
      });
      setCloudError(null);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [canUploadVcf, patientId, patientOutput]);

  const dynamicVitalCards = useMemo(() => {
    if (!patientOutput) {
      return VITAL_CARDS;
    }

    const pulse = Math.min(136, 76 + Math.round(variantCount / 2));
    const systolic = Math.min(162, 120 + Math.round(variantCount / 5));
    const diastolic = Math.min(102, 80 + Math.round(variantCount / 8));
    const spo2 = Math.max(90, 98 - Math.round(variantCount / 20));
    const resp = Math.min(30, 16 + Math.round(variantCount / 12));

    return [
      { icon: 'T', label: 'Temperature', value: fieldString('vitals_temperature', severity === 'critical' ? '100.8' : '99.4'), unit: '°F' },
      { icon: 'BP', label: 'Blood Pressure', value: fieldString('vitals_bloodPressure', `${systolic}/${diastolic}`), unit: 'mmHg' },
      { icon: 'P', label: 'Pulse', value: fieldString('vitals_pulse', String(pulse)), unit: 'bpm' },
      { icon: 'O₂', label: 'SpO₂', value: fieldString('vitals_spo2', String(spo2)), unit: '%' },
      { icon: 'RR', label: 'Respiratory Rate', value: fieldString('vitals_respiratoryRate', String(resp)), unit: 'breaths/min' },
    ] as const;
  }, [fieldString, patientOutput, severity, variantCount]);

  const dynamicInsights = useMemo(() => {
    if (!patientOutput) {
      return {
        lead: 'Elevated WBC trajectory follows the recent medication change and is classified as clinically significant.',
        bullets: [
          'WBC increase results from post-adjustment medication exposure across the current monitoring window.',
          'CYP2D6 phenotype is classified as accelerated metabolism for the selected opioid regimen.',
          'SpO₂ and respiratory rate remain within baseline operating range.',
          'Uncertainty is limited to one low-depth allele region and does not alter the current risk classification.',
        ],
      };
    }

    return {
      lead: `${riskLabel} classification follows parsed VCF evidence for patient ${patientId} and is treated as the active clinical decision state.`,
      bullets: [
        `Primary gene ${primaryGene} with diplotype ${diplotype} maps to phenotype ${phenotype}.`,
        `${patientOutput.clinical_recommendation.rationale}`,
        `Variant evidence count is ${variantCount}, with source file ${patientOutput.quality_metrics.file_name}.`,
        `${patientOutput.llm_generated_explanation.summary}`,
      ],
    };
  }, [diplotype, patientId, patientOutput, phenotype, primaryGene, riskLabel, variantCount]);

  const cloudLabReportArtifacts = useMemo<DashboardLabArtifact[]>(() => {
    const raw = cloudFields.labReports;
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .map((entry) => {
        const id = typeof entry?.id === 'string' ? entry.id : '';
        const title = typeof entry?.title === 'string' ? entry.title : 'Lab Report';
        const sourceType = entry?.sourceType === 'pdf' ? 'pdf' : 'structured';
        const findings = typeof entry?.findings === 'string' ? entry.findings : '';
        const createdAt = typeof entry?.createdAt === 'string' ? entry.createdAt : new Date().toISOString();
        const createdBy = typeof entry?.createdBy === 'string' ? entry.createdBy : 'Lab';
        const aiSummary = typeof entry?.aiSummary === 'string' ? entry.aiSummary : '';
        const values = Array.isArray(entry?.values)
          ? entry.values.map((row: { name?: unknown; value?: unknown; reference?: unknown }) => ({
              name: String(row?.name || 'Marker'),
              value: String(row?.value || 'N/A'),
              reference: String(row?.reference || 'N/A'),
            }))
          : [];

        if (!id || !findings.trim()) {
          return null;
        }

        return {
          id,
          patientId,
          title,
          sourceType,
          findings,
          values,
          aiSummary,
          createdAt,
          createdBy,
        };
      })
      .filter((entry): entry is DashboardLabArtifact => entry !== null)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }, [cloudFields.labReports, patientId]);

  const mergedLabReportArtifacts = useMemo(
    () => mergeLabReportArtifacts(cloudLabReportArtifacts, localLabReports),
    [cloudLabReportArtifacts, localLabReports],
  );

  const fallbackLabSignals = useMemo(
    () => ({
      wbc: fieldString('labs_wbc', String(7600 + Math.round(variantCount * 12))),
      creatinine: fieldString('labs_creatinine', (1 + variantCount / 120).toFixed(2)),
      alt: fieldString('labs_alt', String(34 + Math.round(variantCount / 3))),
      specimenTurnaround: fieldString('labs_turnaround', '26 min'),
    }),
    [cloudFields, variantCount],
  );

  const labRealtimeView = useMemo(
    () =>
      buildLabRealtimeView({
        patientId,
        riskLabel,
        severityLabel,
        reports: mergedLabReportArtifacts,
        fallbackSignals: fallbackLabSignals,
      }),
    [fallbackLabSignals, mergedLabReportArtifacts, patientId, riskLabel, severityLabel],
  );

  const selectedLabReportArtifact = useMemo(() => {
    if (!selectedPdfDocument?.linkedReportId) {
      return null;
    }

    return mergedLabReportArtifacts.find((report) => report.id === selectedPdfDocument.linkedReportId) ?? null;
  }, [mergedLabReportArtifacts, selectedPdfDocument]);

  const persistedPdfDocuments = useMemo<PdfViewerDocument[]>(() => {
    const raw = cloudFields.reportDocuments;
    if (!Array.isArray(raw)) {
      return [];
    }

    const mapped: Array<PdfViewerDocument | null> = raw.map((entry): PdfViewerDocument | null => {
        const id = typeof entry?.id === 'string' ? entry.id.trim() : '';
        const title = typeof entry?.title === 'string' ? entry.title.trim() : '';
        const urlCandidate =
          typeof entry?.url === 'string'
            ? entry.url.trim()
            : typeof entry?.dataUrl === 'string'
              ? entry.dataUrl.trim()
              : '';
        const createdAt = typeof entry?.createdAt === 'string' ? entry.createdAt : new Date().toISOString();
        const owner = typeof entry?.owner === 'string' ? entry.owner : 'Authorized Staff';
        const source = entry?.source === 'uploaded' ? 'uploaded' : 'generated';
        const reportKind =
          entry?.reportKind === 'prescription' || entry?.reportKind === 'lab_report' || entry?.reportKind === 'uploaded_lab'
            ? entry.reportKind
            : undefined;
        const linkedReportId = typeof entry?.linkedReportId === 'string' ? entry.linkedReportId : undefined;

        if (!id || !title || !urlCandidate.startsWith('data:application/pdf')) {
          return null;
        }

        return {
          id,
          title,
          url: urlCandidate,
          createdAt,
          owner,
          source,
          reportKind,
          linkedReportId,
        };
      });

    return mapped
      .filter((document): document is PdfViewerDocument => document !== null)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }, [cloudFields.reportDocuments]);

  const mergedPdfDocuments = useMemo(
    () => mergePdfDocuments(persistedPdfDocuments, localPdfDocuments),
    [localPdfDocuments, persistedPdfDocuments],
  );

  useEffect(() => {
    setPdfDocuments(mergedPdfDocuments);
  }, [mergedPdfDocuments]);

  const trendControls = (
    <header className="trend-controls">
      <div className="trend-tabs">
        <button className={scope === 'labs' ? 'active' : ''} onClick={() => setScope('labs')} type="button">
          Lab Results
        </button>
        <button className={scope === 'vitals' ? 'active' : ''} onClick={() => setScope('vitals')} type="button">
          Vital Trends
        </button>
        <button className={scope === 'medications' ? 'active' : ''} onClick={() => setScope('medications')} type="button">
          Medication Response
        </button>
        <button className={scope === 'genomics' ? 'active' : ''} onClick={() => setScope('genomics')} type="button">
          Genomic Risk
        </button>
      </div>
      <div className="range-selector" role="tablist" aria-label="Time range selector">
        {(Object.keys(RANGE_LABELS) as RangeKey[]).map((key) => (
          <button key={key} className={range === key ? 'active' : ''} onClick={() => setRange(key)} type="button">
            {RANGE_LABELS[key]}
          </button>
        ))}
      </div>
    </header>
  );

  const panelContext = {
    patientId,
    patientOutput,
    severityLabel,
    riskLabel,
    variantCount,
    primaryGene,
    phenotype,
    diplotype,
    outputTimestamp,
  };

  const latestClinicalNote = useMemo(() => {
    if (!cloudRecord?.notes?.length) {
      return '';
    }

    return cloudRecord.notes
      .slice()
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())[0]?.text;
  }, [cloudRecord?.notes]);

  const medicationsContext = fieldString('currentMedications', patientOutput?.drug ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  const prescriptionAlert = useMemo(
    () =>
      buildClinicalPrescriptionAlert({
        output: patientOutput,
        age: fieldString('age', '47'),
        weight: fieldString('weight', ''),
        organFunction: fieldString('organFunction', ''),
        currentMedications: medicationsContext,
        clinicalNotes: latestClinicalNote,
      }),
    [latestClinicalNote, medicationsContext, patientOutput],
  );

  const editableAuditFields = [
    { key: 'manual_triageLevel', label: 'Manual Triage Level', fallback: 'Standard' },
    { key: 'manual_reviewStatus', label: 'Manual Review Status', fallback: 'Pending' },
    { key: 'manual_escalationOwner', label: 'Escalation Owner', fallback: 'Unassigned' },
    { key: 'manual_nextReviewAt', label: 'Next Review Time', fallback: 'Not scheduled' },
    { key: 'manual_bedAssignment', label: 'Bed Assignment', fallback: 'Not assigned' },
  ] as const;
  const editableFieldKeys = new Set<string>(editableAuditFields.map((field) => field.key));

  const handleSaveManualField = async (fieldKey: string, value: string, note: string) => {
    if (!canEditNonMedication) {
      throw new Error('Your role is read-only for manual operational fields.');
    }

    if (!editableFieldKeys.has(fieldKey)) {
      throw new Error('Field is not editable because it is AI-derived.');
    }

    const updated = await updatePatientField(patientId, {
      fieldKey,
      value,
      note,
      editedBy: staffName,
      editorEmail: user?.email ?? '',
    });

    setCloudRecord({
      hospitalId: updated.hospitalId,
      fields: updated.fields,
      edits: updated.edits,
      notes: updated.notes,
      auditLogs: updated.auditLogs,
    });
  };

  const handleAddClinicalNote = async (note: string) => {
    if (!canAddNotes) {
      throw new Error('Your role cannot add clinical notes.');
    }

    const updated = await addPatientNote(patientId, {
      text: note,
      author: staffName,
      authorEmail: user?.email ?? '',
    });

    setCloudRecord({
      hospitalId: updated.hospitalId,
      fields: updated.fields,
      edits: updated.edits,
      notes: updated.notes,
      auditLogs: updated.auditLogs,
    });
  };

  const handleSaveVitalsField = async (fieldKey: string, value: unknown, note: string) => {
    if (!canEditVitals) {
      throw new Error('Your role cannot modify vitals entries.');
    }

    const allowedVitalsFieldKeys = new Set([
      'vitals_temperature',
      'vitals_bloodPressure',
      'vitals_pulse',
      'vitals_spo2',
      'vitals_respiratoryRate',
      'vitals_painScore',
      'manual_alertLog',
      'manual_handoffLog',
    ]);

    if (!allowedVitalsFieldKeys.has(fieldKey)) {
      throw new Error('Only vitals fields are editable in this panel.');
    }

    const updated = await updatePatientField(patientId, {
      fieldKey,
      value,
      note,
      editedBy: staffName,
      editorEmail: user?.email ?? '',
    });

    setCloudRecord({
      hospitalId: updated.hospitalId,
      fields: updated.fields,
      edits: updated.edits,
      notes: updated.notes,
      auditLogs: updated.auditLogs,
    });
  };

  const upsertLocalPdfDocument = (document: PdfViewerDocument) => {
    setLocalPdfDocuments((current) => mergePdfDocuments([document], current));
  };

  const upsertLocalLabReport = (report: DashboardLabArtifact) => {
    setLocalLabReports((current) => mergeLabReportArtifacts([report], current));
  };

  const handleSavePrescription = async (payload: {
    diagnosis: string;
    medication: string;
    dosage: string;
    instructions: string;
    aiSuggestion: string;
    finalDecision: string;
    justification: string;
  }) => {
    if (!canEditPrescription || !canEditMedication) {
      throw new Error('Prescription editing is restricted to doctor role.');
    }

    setIsPrescriptionSaving(true);
    const prescriptionPdf = buildPdfDocument(
      `Prescription Summary · ${patientId}`,
      `${patientId}-prescription-summary.pdf`,
      [
        { label: 'Patient', value: patientId },
        { label: 'Clinician', value: staffName },
        { label: 'Diagnosis', value: payload.diagnosis },
        { label: 'Medication', value: payload.medication },
        { label: 'Dosage', value: payload.dosage },
        { label: 'Instructions', value: payload.instructions },
        { label: 'AI Suggestion', value: payload.aiSuggestion },
        { label: 'Final Decision', value: payload.finalDecision },
        { label: 'Justification', value: payload.justification },
      ],
      staffName,
    );
    const prescriptionPdfDocument: PdfViewerDocument = {
      ...prescriptionPdf,
      source: 'generated',
      reportKind: 'prescription',
    };

    try {
      const response = await savePrescription(patientId, {
        ...payload,
        pdfDocument: {
          id: prescriptionPdf.id,
          title: prescriptionPdf.title,
          url: prescriptionPdf.url,
          createdAt: prescriptionPdf.createdAt,
          owner: prescriptionPdf.owner,
          source: 'generated',
          reportKind: 'prescription',
        },
      });
      setCloudRecord({
        hospitalId: response.record.hospitalId,
        fields: response.record.fields,
        edits: response.record.edits,
        notes: response.record.notes,
        auditLogs: response.record.auditLogs,
      });
      upsertLocalPdfDocument(prescriptionPdfDocument);
      setSelectedPdfId(prescriptionPdf.id);

      const suggestion = payload.aiSuggestion.trim().toLowerCase();
      const finalDecision = payload.finalDecision.trim().toLowerCase();
      if (suggestion && finalDecision && suggestion !== finalDecision) {
        await recordAiDecision(patientId, {
          action: 'prescription_override',
          aiSuggestion: payload.aiSuggestion,
          finalDecision: payload.finalDecision,
          justification: payload.justification,
        });
      }

      setQueueActionStatus('Prescription saved, audited, and exported as PDF.');
    } catch {
      upsertLocalPdfDocument(prescriptionPdfDocument);
      setSelectedPdfId(prescriptionPdf.id);
      setQueueActionStatus('Backend sync failed. Prescription PDF cached locally and will persist after reload.');
    } finally {
      setIsPrescriptionSaving(false);
    }
  };

  const handleSaveLabReport = async (payload: {
    title: string;
    sourceType: 'pdf' | 'structured';
    findings: string;
    values: Array<{ name: string; value: string; reference: string }>;
  }) => {
    if (!canEditLab && !canUploadLab) {
      throw new Error('Lab report authoring is restricted to lab technician role.');
    }

    setIsLabReportSaving(true);
    const reportPdf = buildPdfDocument(
      `Lab Report Summary · ${patientId}`,
      `${patientId}-lab-report-summary.pdf`,
      [
        { label: 'Patient', value: patientId },
        { label: 'Title', value: payload.title },
        { label: 'Source Type', value: payload.sourceType },
        { label: 'Findings', value: payload.findings },
      ],
      staffName,
    );
    const localDraftReportId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const localDraftReport: DashboardLabArtifact = {
      id: localDraftReportId,
      patientId,
      title: payload.title,
      sourceType: payload.sourceType,
      findings: payload.findings,
      values: payload.values,
      aiSummary: `Local cache summary: ${payload.findings}`,
      createdAt: new Date().toISOString(),
      createdBy: staffName,
    };

    try {
      const response = await saveLabReport(patientId, {
        ...payload,
        pdfDocument: {
          id: reportPdf.id,
          title: reportPdf.title,
          url: reportPdf.url,
          createdAt: reportPdf.createdAt,
          owner: reportPdf.owner,
          source: 'generated',
          reportKind: 'lab_report',
        },
      });
      setCloudRecord({
        hospitalId: response.record.hospitalId,
        fields: response.record.fields,
        edits: response.record.edits,
        notes: response.record.notes,
        auditLogs: response.record.auditLogs,
      });

      const serverReport: DashboardLabArtifact = {
        ...response.report,
        patientId: response.report.patientId || patientId,
        values: Array.isArray(response.report.values) ? response.report.values : [],
      };
      upsertLocalLabReport(serverReport);
      upsertLocalPdfDocument({
        ...reportPdf,
        source: 'generated',
        reportKind: 'lab_report',
        linkedReportId: serverReport.id,
      });
      setSelectedPdfId(reportPdf.id);

      setQueueActionStatus('Lab report saved with auto-summary and PDF export.');
    } catch {
      upsertLocalLabReport(localDraftReport);
      upsertLocalPdfDocument({
        ...reportPdf,
        source: 'generated',
        reportKind: 'lab_report',
        linkedReportId: localDraftReport.id,
      });
      setSelectedPdfId(reportPdf.id);
      setQueueActionStatus('Backend sync failed. Lab report and PDF saved locally and persisted for reloads.');
    } finally {
      setIsLabReportSaving(false);
    }
  };

  const handleAttachLabPdf = async (
    file: File,
    payload: {
      title: string;
      sourceType: 'pdf' | 'structured';
      findings: string;
      values: Array<{ name: string; value: string; reference: string }>;
    },
  ) => {
    if (!canEditLab && !canUploadLab) {
      throw new Error('Lab report authoring is restricted to lab technician role.');
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error('Only PDF files are supported.');
    }

    if (file.size > MAX_PDF_UPLOAD_BYTES) {
      const limitMb = Math.round((MAX_PDF_UPLOAD_BYTES / (1024 * 1024)) * 10) / 10;
      const currentMb = Math.round((file.size / (1024 * 1024)) * 10) / 10;
      throw new Error(`PDF is too large (${currentMb} MB). Maximum supported size is ${limitMb} MB.`);
    }

    const dataUrl = await fileToDataUrl(file);
    triggerPdfDownload(dataUrl, payload.title || file.name);

    setIsLabReportSaving(true);
    try {
      const pdfId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const createdAt = new Date().toISOString();

      const response = await saveLabReport(patientId, {
        ...payload,
        sourceType: 'pdf',
        pdfDocument: {
          id: pdfId,
          title: payload.title || file.name,
          url: dataUrl,
          createdAt,
          owner: staffName,
          source: 'uploaded',
          reportKind: 'uploaded_lab',
        },
      });

      setCloudRecord({
        hospitalId: response.record.hospitalId,
        fields: response.record.fields,
        edits: response.record.edits,
        notes: response.record.notes,
        auditLogs: response.record.auditLogs,
      });

      const serverReport: DashboardLabArtifact = {
        ...response.report,
        patientId: response.report.patientId || patientId,
        values: Array.isArray(response.report.values) ? response.report.values : [],
      };
      upsertLocalLabReport(serverReport);
      upsertLocalPdfDocument({
        id: pdfId,
        title: payload.title || file.name,
        url: dataUrl,
        createdAt,
        owner: staffName,
        source: 'uploaded',
        reportKind: 'uploaded_lab',
        linkedReportId: serverReport.id,
      });

      setSelectedPdfId(pdfId);
      setQueueActionStatus(`Uploaded PDF ${file.name} saved and linked to reports.`);
      setActivePanel('reports');
    } catch {
      const fallbackCreatedAt = new Date().toISOString();
      const fallbackReportId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const localReport: DashboardLabArtifact = {
        id: fallbackReportId,
        patientId,
        title: payload.title || file.name,
        sourceType: 'pdf',
        findings: payload.findings || 'Uploaded PDF report',
        values: payload.values,
        aiSummary: `Local cache summary: ${payload.findings || 'Uploaded PDF report'}`,
        createdAt: fallbackCreatedAt,
        createdBy: staffName,
      };

      const fallbackPdfId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      upsertLocalLabReport(localReport);
      upsertLocalPdfDocument({
        id: fallbackPdfId,
        title: payload.title || file.name,
        url: dataUrl,
        createdAt: fallbackCreatedAt,
        owner: staffName,
        source: 'uploaded',
        reportKind: 'uploaded_lab',
        linkedReportId: localReport.id,
      });

      setSelectedPdfId(fallbackPdfId);
      setQueueActionStatus(`Backend sync failed. Uploaded PDF ${file.name} cached locally and available after reload.`);
      setActivePanel('reports');
    } finally {
      setIsLabReportSaving(false);
    }
  };

  const openDetailedReport = () => {
    setActivePanel('reports');
    setQueueActionStatus('Detailed report opened for current patient record.');
  };

  const submitReviewFlag = async () => {
    setIsQueueActionSaving(true);
    try {
      await handleSaveManualField('manual_reviewStatus', 'Flagged for multidisciplinary review', 'Review flag submitted from procedural input queue.');
      setQueueActionStatus('Review flag submitted and saved to patient audit fields.');
    } catch {
      setQueueActionStatus('Unable to submit review flag. Please retry.');
    } finally {
      setIsQueueActionSaving(false);
    }
  };

  const exportAuditDataset = () => {
    if (!cloudRecord) {
      setQueueActionStatus('No synchronized cloud record available to export yet.');
      return;
    }

    const payload = {
      patientId,
      exportedAt: new Date().toISOString(),
      record: cloudRecord,
      intakeOutput: patientOutput,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${patientId}-audit-dataset.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    setQueueActionStatus(`Audit dataset exported for ${patientId}.`);
  };

  const recordClinicianNoteFromQueue = async () => {
    const note = window.prompt('Enter clinician note for this patient record:')?.trim() || '';
    if (!note) {
      setQueueActionStatus('Clinician note was not recorded.');
      return;
    }

    setIsQueueActionSaving(true);
    try {
      await handleAddClinicalNote(note);
      setQueueActionStatus('Clinician note recorded and attached to audit trail.');
    } catch {
      setQueueActionStatus('Unable to record clinician note. Please retry.');
    } finally {
      setIsQueueActionSaving(false);
    }
  };

  const displayPatientName = fieldString('patientName', 'Eric Carlson');
  const displayAge = fieldString('age', '47');
  const labsSnapshot = {
    wbc: fieldString('labs_wbc', '6380'),
    rbc: fieldString('labs_rbc', '5.2'),
    trend: fieldString('labs_trend', variantCount > 50000 ? 'Elevated trend requires follow-up' : 'Stable baseline trend'),
  };
  const overviewAuditItems = [
    {
      message: queueActionStatus || `${patientId} record accessed`,
      when: 'Now',
    },
    {
      message: cloudRecord?.edits?.[0]?.note || 'Medication response reviewed',
      when: cloudRecord?.edits?.[0]?.timestamp ? new Date(cloudRecord.edits[0].timestamp).toLocaleTimeString() : 'Recent',
    },
    {
      message: cloudRecord?.notes?.[0]?.text || 'Clinical note queue ready',
      when: cloudRecord?.notes?.[0]?.timestamp ? new Date(cloudRecord.notes[0].timestamp).toLocaleTimeString() : 'Recent',
    },
  ];

  return (
    <main className="redesign-dashboard-shell">
      <aside className="redesign-sidebar" aria-label="Dashboard navigation">
        <div className="redesign-brand">
          <span className="redesign-brand-mark">PK</span>
          <p>PHARMAKON</p>
        </div>

        <nav className="redesign-nav">
          <div style={{ padding: '0.4rem 0.8rem 0.2rem', fontSize: '0.68rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>
            ERP Hospital Suite
          </div>
          <Link to="/registry" className="redesign-nav-item" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            <span>Patient Registry</span>
          </Link>
          <Link to={`/appointments?patientId=${encodeURIComponent(patientId)}`} className="redesign-nav-item">
            <span>Appointments</span>
          </Link>
          <Link to={`/billing?patientId=${encodeURIComponent(patientId)}`} className="redesign-nav-item">
            <span>Billing & Claims</span>
          </Link>
          <Link to="/pharmacy" className="redesign-nav-item">
            <span>Pharmacy Stock</span>
          </Link>
          <Link to="/wards" className="redesign-nav-item">
            <span>Wards Matrix</span>
          </Link>

          <div style={{ padding: '0.8rem 0.8rem 0.2rem', fontSize: '0.68rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>
            Clinical Console
          </div>
          {availableNavItems.map((item) => (
            <button
              type="button"
              className={`redesign-nav-item ${item.key === activePanel ? 'active' : ''}`}
              key={item.key}
              onClick={() => setActivePanel(item.key)}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="redesign-sidebar-footer">
          <div>
            <strong>{staffName}</strong>
            <p>
              {roleDisplay} · {hospital?.name ?? 'Hospital'}
            </p>
          </div>
          <button type="button" onClick={signOut}>
            Logout
          </button>
        </div>
      </aside>

      <section className="redesign-main">
        {isDemoMode ? (
          <div className="dashboard-mode-banner" role="status" aria-live="polite">
            Demo / Non-clinical mode active · simulated workflows only
          </div>
        ) : null}

        <header className="redesign-topbar">
          <div className="redesign-topbar-left" role="search">
            <input
              placeholder="Search patient ID"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  openPatient(searchInput);
                }
              }}
            />
            <button type="button" onClick={() => openPatient(searchInput)}>
              Open
            </button>
            <p>
              Patients <span>/ {patientId}</span>
            </p>
          </div>

          <div className="redesign-topbar-right">
            <span className="redesign-avatar">{staffInitials || 'HS'}</span>
            {canUploadVcf ? (
              <Link to="/upload" className="redesign-action-btn redesign-action-btn--primary">
                Re-Intake
              </Link>
            ) : null}
            <button type="button" className="redesign-action-btn" onClick={signOut}>
              Sign out
            </button>
          </div>
        </header>

        {patientSearchError ? <small className="topbar-search-status">{patientSearchError}</small> : null}
        {!patientSearchError && isSearchingPatients ? <small className="topbar-search-status">Searching records...</small> : null}
        {!patientSearchError && !isSearchingPatients && searchInput.trim() && patientSearchResults.length === 0 ? (
          <small className="topbar-search-status">No existing record matched this ID.</small>
        ) : null}
        {!isSearchingPatients && patientSearchResults.length > 0 ? (
          <ul className="topbar-search-results" aria-label="Matching patient records">
            {patientSearchResults.map((entry) => (
              <li key={entry.patientId}>
                <button
                  type="button"
                  onClick={() => openPatient(entry.patientId)}
                  className={`topbar-search-result ${entry.patientId === patientId ? 'active' : ''}`}
                >
                  <strong>{entry.patientId}</strong>
                  <span>
                    {entry.riskLabel || 'Unknown risk'} · {entry.sourceFile || 'No source file'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {activePanel === 'vitals' ? (
          <section className="redesign-card redesign-panel-shell">
            <VitalsConsolePanel
              patientId={patientId}
              fieldValues={cloudFields}
              edits={cloudRecord?.edits ?? []}
              canEdit={canEditVitals}
              onSaveField={handleSaveVitalsField}
            />
          </section>
        ) : activePanel === 'labs' ? (
          <>
            <section className="redesign-card redesign-panel-shell">
              <LabsPanel {...panelContext} realtime={labRealtimeView} />
            </section>
            {canEditLab || canUploadLab ? (
              <section className="redesign-card redesign-panel-shell">
                <LabReportEditorPanel
                  canEdit={canEditLab || canUploadLab}
                  isSaving={isLabReportSaving}
                  onSave={handleSaveLabReport}
                  onAttachPdf={handleAttachLabPdf}
                />
              </section>
            ) : null}
            <section className="redesign-card redesign-panel-shell">
              <article className="card-shell">
                <h2 className="ops-heading">Saved Lab Reports</h2>
                {mergedLabReportArtifacts.length ? (
                  <ul className="audit-list">
                    {mergedLabReportArtifacts.slice(0, 6).map((report) => (
                      <li key={report.id}>
                        <span>
                          <strong>{report.title}</strong> · {report.findings}
                        </span>
                        <small>
                          {new Date(report.createdAt).toLocaleString()} · {report.createdBy} · {report.sourceType === 'pdf' ? 'PDF' : 'Structured'}
                        </small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="meta-line">No saved lab reports yet for this patient.</p>
                )}
              </article>
            </section>
          </>
        ) : activePanel === 'genomics' ? (
          <section className="redesign-card redesign-panel-shell">
            <GenomicsPanel {...panelContext} />
          </section>
        ) : activePanel === 'medications' ? (
          <section className="redesign-card redesign-panel-shell">
            {role === 'lab_technician' && !isDemoMode ? (
              <article className="card-shell">
                <h2 className="ops-heading">Restricted Panel</h2>
                <p className="meta-line">Lab technicians do not have access to medications or prescriptions.</p>
              </article>
            ) : (
              <MedicationsPanel {...panelContext} />
            )}
          </section>
        ) : activePanel === 'prescription' ? (
          <section className="redesign-card redesign-panel-shell">
            <PrescriptionEditorPanel
              patientId={patientId}
              clinicianName={staffName}
              riskLevel={prescriptionAlert.riskLevel}
              aiRecommendation={prescriptionAlert.recommendedAction}
              aiRationale={prescriptionAlert.reasoningSteps.join(' ')}
              saferAlternatives={prescriptionAlert.saferAlternatives}
              canEdit={canEditPrescription && canEditMedication}
              isSaving={isPrescriptionSaving}
              onSave={handleSavePrescription}
            />
          </section>
        ) : activePanel === 'trends' ? (
          <section className="redesign-card redesign-panel-shell">
            <TrendsPanel
              {...panelContext}
              trendSeries={trendSeries}
              scopeLabel={scope.toUpperCase()}
              rangeLabel={RANGE_LABELS[range]}
              controls={trendControls}
            />
          </section>
        ) : activePanel === 'reports' ? (
          <>
            <section className="redesign-card redesign-panel-shell">
              <ReportsPanel
                {...panelContext}
                selectedPdf={selectedPdfDocument}
                selectedLinkedLabReport={selectedLabReportArtifact}
                labReports={mergedLabReportArtifacts}
              />
            </section>
            <section className="redesign-card redesign-panel-shell">
              <PdfViewerPanel
                documents={pdfDocuments}
                activeDocumentId={selectedPdfDocument?.id ?? null}
                onSelectDocument={setSelectedPdfId}
              />
            </section>
          </>
        ) : activePanel === 'audit' ? (
          <section className="redesign-card redesign-panel-shell">
            <AuditPanel
              {...panelContext}
              fieldValues={cloudFields}
              edits={cloudRecord?.edits ?? []}
              notes={cloudRecord?.notes ?? []}
              auditLogs={cloudRecord?.auditLogs ?? []}
              editableFields={[...editableAuditFields]}
              canEditManualFields={canEditNonMedication}
              canAddNotes={canAddNotes}
              onSaveField={handleSaveManualField}
              onAddNote={handleAddClinicalNote}
            />
          </section>
        ) : (
          <section className="redesign-content-grid" aria-label="Patient dashboard">
            <article className="redesign-card redesign-card--overview">
              <header>
                <h1>Patient Overview</h1>
                <p>
                  Patients / <span>{patientId}</span>
                </p>
              </header>

              <div className="overview-profile">
                <div className="overview-avatar" aria-hidden="true" />
                <div>
                  <h2>{displayPatientName}</h2>
                  <p>
                    ID: {patientId} · Age {displayAge}
                  </p>
                  <p>MRN: {fieldString('mrn', 'MRN143805')}</p>
                  <p className="overview-updated">Last updated: {outputTimestamp}</p>
                </div>
                <span className="overview-status">Completed</span>
              </div>

              <div className="overview-medications">
                {medicationsContext.length ? medicationsContext.map((entry) => <span key={entry}>{entry}</span>) : <span>No active meds</span>}
              </div>

              <div className="overview-followup">
                <span>{fieldString('manual_nextReviewAt', 'Follow up in 3 months')}</span>
                <strong>{fieldString('manual_reviewStatus', 'ACTIVE')}</strong>
              </div>
              <p className="meta-line">{verdictHeadline}</p>
            </article>

            <article className="redesign-card redesign-card--vitals">
              <header className="section-header">
                <h3>Vitals</h3>
                <p>Live Snapshot</p>
              </header>
              <div className="metric-row">
                {dynamicVitalCards.slice(0, 4).map((card) => (
                  <div key={card.label}>
                    <strong>{card.value}</strong>
                    <span>{card.label}</span>
                  </div>
                ))}
              </div>
              <TrendChart title="Vitals Trend" yAxisLabel="Selected clinical values" series={trendSeries} />
            </article>

            <article className="redesign-card redesign-card--medications">
              <header className="section-header">
                <h3>Medications</h3>
                <span className="pill">Validated</span>
              </header>
              <p className="warning">⚠ {riskLabel}</p>
              <div className="risk-line">
                <span>{primaryGene}</span>
                <strong>{severityLabel}</strong>
                <span>{Math.round(confidence * 100)}% confidence</span>
              </div>
              <p className="meta-line">
                {diplotype} · {phenotype} · Source {fieldString('sourceFile', 'Unknown source')}
              </p>
              <p className="recommendation">{verdictAction}</p>
              <p className="meta-line">{prescriptionAlert.header}</p>
            </article>

            <article className="redesign-card redesign-card--labs">
              <header className="section-header">
                <h3>Labs</h3>
                <p>Current</p>
              </header>
              <div className="metric-row metric-row--compact">
                <div>
                  <strong>{labsSnapshot.wbc}</strong>
                  <span>WBC</span>
                </div>
                <div>
                  <strong>{labsSnapshot.rbc}</strong>
                  <span>RBC</span>
                </div>
                <div>
                  <strong>{variantCount.toLocaleString()}</strong>
                  <span>Variant Count</span>
                </div>
              </div>
              <p className="meta-line">{labsSnapshot.trend}</p>
            </article>

            <article className="redesign-card redesign-card--audit">
              <header className="section-header">
                <h3>Audit Logs</h3>
                <button type="button" className="redesign-action-btn" onClick={openDetailedReport}>
                  Open Report
                </button>
              </header>
              <ul className="audit-list">
                {overviewAuditItems.map((item, index) => (
                  <li key={`${item.message}-${index}`}>
                    <span>{item.message}</span>
                    <small>{item.when}</small>
                  </li>
                ))}
              </ul>
              <p className="meta-line" style={{ marginTop: '0.45rem' }}>{dynamicInsights.lead}</p>
              <div className="action-buttons" style={{ marginTop: '0.5rem' }}>
                <button type="button" onClick={submitReviewFlag} disabled={isQueueActionSaving || !canEditNonMedication}>
                  Submit Review Flag
                </button>
                <button type="button" onClick={exportAuditDataset}>
                  Export Audit Dataset
                </button>
                <button type="button" onClick={recordClinicianNoteFromQueue} disabled={isQueueActionSaving || !canAddNotes}>
                  Record Clinician Note
                </button>
              </div>
            </article>
          </section>
        )}

        {cloudError ? <p className="auth-error">{cloudError}</p> : null}
      </section>
    </main>
  );
}
