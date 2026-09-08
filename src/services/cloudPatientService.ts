import type {
  AggregatedPatientRecord,
  AiDraftOutput,
  AuditLogEntry,
  CloudPatientRecord,
  LabReportRecord,
  PrescriptionRecord,
} from '../types/domain';
import { getIdentityHeaders, readStoredSession } from '../state/authSession';

const rawApiBase = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE = rawApiBase.replace(/\/$/, '');
const HEALTH_CACHE_TTL_MS = 5000;

interface HealthResponse {
  databaseReady?: boolean;
}

let cachedHealthProbeAt = 0;
let cachedDatabaseReady = true;

export class ApiRequestError extends Error {
  status: number;
  rawBody: string;

  constructor(status: number, message: string, rawBody = '') {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.rawBody = rawBody;
  }
}

export function isApiRequestError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError;
}

interface UpdateFieldPayload {
  fieldKey: string;
  value: unknown;
  editedBy: string;
  editorEmail: string;
  note: string;
}

interface AddNotePayload {
  text: string;
  author: string;
  authorEmail: string;
}

interface SavePrescriptionPayload {
  diagnosis: string;
  medication: string;
  dosage: string;
  instructions: string;
  aiSuggestion: string;
  finalDecision: string;
  justification: string;
  pdfDocument?: {
    id: string;
    title: string;
    url: string;
    createdAt: string;
    owner: string;
    source?: 'generated' | 'uploaded';
    reportKind?: 'prescription' | 'lab_report' | 'uploaded_lab';
    linkedReportId?: string;
  };
}

interface SaveLabReportPayload {
  title: string;
  sourceType: 'pdf' | 'structured';
  findings: string;
  values: Array<{ name: string; value: string; reference: string }>;
  pdfDocument?: {
    id: string;
    title: string;
    url: string;
    createdAt: string;
    owner: string;
    source?: 'generated' | 'uploaded';
    reportKind?: 'prescription' | 'lab_report' | 'uploaded_lab';
    linkedReportId?: string;
  };
}

interface RecordAiDecisionPayload {
  action: string;
  aiSuggestion: string;
  finalDecision: string;
  justification: string;
}

export interface PatientSearchResult {
  patientId: string;
  updatedAt: string;
  sourceFile: string | null;
  riskLabel: string | null;
}

export interface IntakeInputContext {
  fullName?: string;
  dateOfBirth?: string;
  patientAge?: string;
  gender?: string;
  sexAtBirth?: string;
  phoneNumber?: string;
  email?: string;
  city?: string;
  state?: string;
  country?: string;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string;
  hospitalId?: string;
  assignedDoctor?: string;
  department?: string;
  admissionType?: 'OPD' | 'IPD' | 'Emergency';
  admissionDate?: string;
  caseType?: 'New' | 'Follow-up';
  selectedMedications?: string[];
  sourceFile?: string;
  capturedAt?: string;
}

export interface ConvertInPatientPayload {
  admittedBy?: string;
  admissionNote?: string;
}

export interface ConvertOutPatientPayload {
  dischargedBy?: string;
  dischargeNote?: string;
}

export interface SyncIntakeResponse extends CloudPatientRecord {
  dms?: {
    mode?: string;
    tempDocumentId?: string;
    status?: string;
  };
}

export interface PatientDmsQueryOptions {
  limit?: number;
  includeTempPayload?: boolean;
  includeRecord?: boolean;
}

export interface PatientDmsTempDocument {
  documentId: string | null;
  path: string | null;
  capturedAt: string | null;
  exists: boolean;
  docType: string | null;
  schemaVersion: number | null;
  expiresAt: string | null;
  payload?: unknown;
}

export interface PatientDmsResponse {
  patientId: string;
  query: {
    limit: number;
    includeTempPayload: boolean;
    includeRecord: boolean;
  };
  permanentDocument: {
    path: string;
    docType: string;
    schemaVersion: number;
    patientId: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    dms: {
      source?: string;
      intakeHistory?: Array<{
        tempDocumentId?: string;
        tempDocumentPath?: string;
        capturedAt?: string;
      }>;
    };
    record?: unknown;
  };
  temporaryDocuments: PatientDmsTempDocument[];
}

export interface SavePrescriptionResponse {
  record: CloudPatientRecord;
  prescription: PrescriptionRecord;
}

export interface SaveLabReportResponse {
  record: CloudPatientRecord;
  report: LabReportRecord;
}

export interface RecordAiDecisionResponse {
  record: CloudPatientRecord;
  audit: AuditLogEntry;
}

async function parseResponseMessage(response: Response): Promise<{ message: string; raw: string }> {
  const raw = await response.text();
  if (!raw) {
    return { message: `Request failed: ${response.status}`, raw: '' };
  }

  if (raw.includes('PayloadTooLargeError') || raw.includes('request entity too large')) {
    return {
      message: 'Uploaded PDF is too large for the current API limit. Please use a smaller file or increase API_JSON_BODY_LIMIT on the server.',
      raw,
    };
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      const parsed = JSON.parse(raw) as { message?: string };
      if (typeof parsed?.message === 'string' && parsed.message.trim()) {
        return { message: parsed.message, raw };
      }
    } catch {
      // Fall through to raw text.
    }
  }

  return { message: raw, raw };
}

async function probePatientsDatabaseReady(force = false): Promise<boolean> {
  const now = Date.now();
  if (!force && now - cachedHealthProbeAt < HEALTH_CACHE_TTL_MS) {
    return cachedDatabaseReady;
  }

  try {
    const response = await fetch(`${API_BASE}/api/health`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      cachedDatabaseReady = false;
      cachedHealthProbeAt = now;
      return false;
    }

    const payload = (await response.json()) as HealthResponse;
    cachedDatabaseReady = Boolean(payload?.databaseReady);
    cachedHealthProbeAt = now;
    return cachedDatabaseReady;
  } catch {
    cachedDatabaseReady = false;
    cachedHealthProbeAt = now;
    return false;
  }
}

async function ensurePatientsApiReady(path: string): Promise<void> {
  if (!path.startsWith('/api/patients')) {
    return;
  }

  const databaseReady = await probePatientsDatabaseReady();
  if (!databaseReady) {
    throw new ApiRequestError(503, 'Database is temporarily unavailable. Please retry shortly.');
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  await ensurePatientsApiReady(path);

  const identityHeaders = getIdentityHeaders(readStoredSession());
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...identityHeaders,
        ...(init?.headers || {}),
      },
      ...init,
    });
  } catch {
    throw new ApiRequestError(503, 'API service is unreachable. Please verify the backend is running.');
  }

  if (!response.ok) {
    const { message, raw } = await parseResponseMessage(response);
    throw new ApiRequestError(response.status, message || `Request failed: ${response.status}`, raw);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function identityQuerySuffix(): string {
  const session = readStoredSession();
  if (!session) {
    return '';
  }

  const params = new URLSearchParams();
  params.set('hospitalId', session.hospital.hospital_id);
  params.set('userId', session.user.user_id);
  params.set('role', session.mode === 'demo' ? 'demo' : session.user.role);
  params.set('demoMode', String(session.mode === 'demo'));
  return params.toString();
}

export async function fetchPatientRecord(patientId: string): Promise<CloudPatientRecord | null> {
  try {
    return await request<CloudPatientRecord>(`/api/patients/${encodeURIComponent(patientId)}`);
  } catch {
    return null;
  }
}

export async function searchPatientRecords(query: string, limit = 10): Promise<PatientSearchResult[]> {
  const params = new URLSearchParams();
  params.set('query', query);
  params.set('limit', String(limit));

  try {
    return await request<PatientSearchResult[]>(`/api/patients?${params.toString()}`);
  } catch {
    return [];
  }
}

export async function fetchPatientDms(
  patientId: string,
  options: PatientDmsQueryOptions = {},
): Promise<PatientDmsResponse> {
  const params = new URLSearchParams();

  if (typeof options.limit === 'number') {
    params.set('limit', String(options.limit));
  }

  if (typeof options.includeTempPayload === 'boolean') {
    params.set('includeTempPayload', String(options.includeTempPayload));
  }

  if (typeof options.includeRecord === 'boolean') {
    params.set('includeRecord', String(options.includeRecord));
  }

  const querySuffix = params.toString() ? `?${params.toString()}` : '';
  return request<PatientDmsResponse>(`/api/patients/${encodeURIComponent(patientId)}/dms${querySuffix}`);
}

export async function syncPatientFromIntake(
  patientId: string,
  intakeOutput: AiDraftOutput | null,
  intakeInput?: IntakeInputContext,
): Promise<SyncIntakeResponse> {
  return request<SyncIntakeResponse>(`/api/patients/${encodeURIComponent(patientId)}/sync-intake`, {
    method: 'POST',
    body: JSON.stringify({ intakeOutput, intakeInput: intakeInput || null }),
  });
}

export async function discardTempIntakeDocument(patientId: string, tempDocumentId: string): Promise<void> {
  await request(`/api/patients/${encodeURIComponent(patientId)}/discard-temp-intake`, {
    method: 'POST',
    body: JSON.stringify({ tempDocumentId }),
  });
}

export function discardTempIntakeDocumentOnUnload(patientId: string, tempDocumentId: string): void {
  if (!patientId || !tempDocumentId) {
    return;
  }

  const identityHeaders = getIdentityHeaders(readStoredSession());

  void fetch(`${API_BASE}/api/patients/${encodeURIComponent(patientId)}/discard-temp-intake`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...identityHeaders,
    },
    body: JSON.stringify({ tempDocumentId }),
    keepalive: true,
  });
}

export async function convertPatientToInPatient(
  patientId: string,
  payload: ConvertInPatientPayload = {},
): Promise<CloudPatientRecord> {
  return request<CloudPatientRecord>(`/api/patients/${encodeURIComponent(patientId)}/convert-inpatient`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function convertPatientToOutPatient(
  patientId: string,
  payload: ConvertOutPatientPayload = {},
): Promise<CloudPatientRecord> {
  return request<CloudPatientRecord>(`/api/patients/${encodeURIComponent(patientId)}/convert-outpatient`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePatientField(patientId: string, payload: UpdateFieldPayload): Promise<CloudPatientRecord> {
  return request<CloudPatientRecord>(`/api/patients/${encodeURIComponent(patientId)}/fields`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function addPatientNote(patientId: string, payload: AddNotePayload): Promise<CloudPatientRecord> {
  return request<CloudPatientRecord>(`/api/patients/${encodeURIComponent(patientId)}/notes`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function savePrescription(
  patientId: string,
  payload: SavePrescriptionPayload,
): Promise<SavePrescriptionResponse> {
  return request<SavePrescriptionResponse>(`/api/patients/${encodeURIComponent(patientId)}/prescriptions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function saveLabReport(patientId: string, payload: SaveLabReportPayload): Promise<SaveLabReportResponse> {
  return request<SaveLabReportResponse>(`/api/patients/${encodeURIComponent(patientId)}/lab-reports`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function recordAiDecision(
  patientId: string,
  payload: RecordAiDecisionPayload,
): Promise<RecordAiDecisionResponse> {
  return request<RecordAiDecisionResponse>(`/api/patients/${encodeURIComponent(patientId)}/ai-decisions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchPatientAuditLog(patientId: string, limit = 100): Promise<AuditLogEntry[]> {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  return request<AuditLogEntry[]>(`/api/patients/${encodeURIComponent(patientId)}/audit?${params.toString()}`);
}

export function subscribePatientRecord(patientId: string, onRecord: (record: CloudPatientRecord | null) => void): () => void {
  const query = identityQuerySuffix();
  const streamUrl = `${API_BASE}/api/patients/${encodeURIComponent(patientId)}/events${query ? `?${query}` : ''}`;
  let events: EventSource | null = null;
  let disposed = false;
  let retryTimer: number | null = null;

  const clearRetryTimer = () => {
    if (retryTimer !== null) {
      window.clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const scheduleReconnect = () => {
    if (disposed || retryTimer !== null) {
      return;
    }

    retryTimer = window.setTimeout(() => {
      retryTimer = null;
      void connect(true);
    }, HEALTH_CACHE_TTL_MS);
  };

  const connect = async (forceProbe = false) => {
    const databaseReady = await probePatientsDatabaseReady(forceProbe);
    if (disposed) {
      return;
    }

    if (!databaseReady) {
      onRecord(null);
      scheduleReconnect();
      return;
    }

    events = new EventSource(streamUrl);

    events.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { type: string; data: CloudPatientRecord | null };
        if (payload.type === 'record') {
          onRecord(payload.data);
        }
      } catch {
        onRecord(null);
      }
    };

    events.onerror = () => {
      events?.close();
      events = null;
      scheduleReconnect();
    };
  };

  void connect();

  return () => {
    disposed = true;
    clearRetryTimer();
    events?.close();
  };
}

export async function fetchAggregatedPatientRecord(longitudinalId: string): Promise<AggregatedPatientRecord> {
  return request<AggregatedPatientRecord>(`/api/longitudinal/${encodeURIComponent(longitudinalId)}`);
}
