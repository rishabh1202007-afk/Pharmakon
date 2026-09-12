import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getPatientFolderDetails,
  getPatientFolderPath,
  initializePatientFolders,
  listAllPatientFolders,
  loadPatientFromFolder,
  sanitizeToken,
  savePatientToFolder,
} from './patientFolderStorage.js';

const app = express();
const PORT = Number(process.env.PORT || 4000);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmaco';
const DB_RETRY_MS = Number(process.env.DB_RETRY_MS || 15000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');
const STORAGE_ROOT_DIR = path.resolve(__dirname, '../fastapi_backend/storage');
const TEMP_INTAKE_DIR = path.join(STORAGE_ROOT_DIR, 'temp', 'intake');
const PATIENT_DMS_DIR = path.join(STORAGE_ROOT_DIR, 'patients');
const ERP_DATA_DIR = path.join(STORAGE_ROOT_DIR, 'erp');
const TEMP_INTAKE_TTL_MS = Number(process.env.INTAKE_TEMP_TTL_MS || 24 * 60 * 60 * 1000);
const TEMP_CLEANUP_INTERVAL_MS = Number(process.env.INTAKE_TEMP_CLEANUP_INTERVAL_MS || 60 * 1000);
const API_JSON_BODY_LIMIT = process.env.API_JSON_BODY_LIMIT || '50mb';
const SUPPORTED_ROLES = new Set(['admin', 'doctor', 'nurse', 'lab_technician', 'demo']);
let databaseReady = false;
let retryTimer = null;
let longitudinalMappingCache = null;

const CONFLICT_CHECK_FIELDS = [
  'riskLabel',
  'severity',
  'confidence',
  'verdictAction',
  'primaryGene',
  'diplotype',
  'phenotype',
  'variantCount',
  'vitals_temperature',
  'vitals_bloodPressure',
  'vitals_pulse',
  'vitals_spo2',
  'vitals_respiratoryRate',
  'labs_wbc',
  'labs_rbc',
];

app.use(cors());
app.use(express.json({ limit: API_JSON_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: API_JSON_BODY_LIMIT }));

// Initial Drug Inventory Data
const DEFAULT_INVENTORY = [
  {
    id: 'INV-001',
    drugName: 'Clopidogrel',
    category: 'Antiplatelet',
    stockLevel: 450,
    unit: 'Tablets (75mg)',
    minThreshold: 100,
    batchNo: 'CLP-2026-B8',
    expiryDate: '2028-11-30',
    unitPrice: 1.25,
    geneTarget: 'CYP2C19',
    status: 'In Stock',
  },
  {
    id: 'INV-002',
    drugName: 'Warfarin',
    category: 'Anticoagulant',
    stockLevel: 280,
    unit: 'Tablets (5mg)',
    minThreshold: 80,
    batchNo: 'WRF-2026-A4',
    expiryDate: '2027-08-15',
    unitPrice: 0.85,
    geneTarget: 'CYP2C9',
    status: 'In Stock',
  },
  {
    id: 'INV-003',
    drugName: 'Codeine',
    category: 'Opioid Analgesic',
    stockLevel: 120,
    unit: 'Tablets (30mg)',
    minThreshold: 50,
    batchNo: 'CDN-2026-C1',
    expiryDate: '2027-05-20',
    unitPrice: 2.10,
    geneTarget: 'CYP2D6',
    status: 'Low Stock',
  },
  {
    id: 'INV-004',
    drugName: 'Simvastatin',
    category: 'Statin',
    stockLevel: 620,
    unit: 'Tablets (20mg)',
    minThreshold: 150,
    batchNo: 'SMV-2026-D9',
    expiryDate: '2028-09-10',
    unitPrice: 0.95,
    geneTarget: 'SLCO1B1',
    status: 'In Stock',
  },
  {
    id: 'INV-005',
    drugName: 'Tacrolimus',
    category: 'Immunosuppressant',
    stockLevel: 85,
    unit: 'Capsules (1mg)',
    minThreshold: 40,
    batchNo: 'TCR-2026-E2',
    expiryDate: '2027-12-01',
    unitPrice: 8.50,
    geneTarget: 'CYP3A5',
    status: 'In Stock',
  },
  {
    id: 'INV-006',
    drugName: 'Aspirin',
    category: 'Antiplatelet / Analgesic',
    stockLevel: 1200,
    unit: 'Tablets (81mg)',
    minThreshold: 200,
    batchNo: 'ASP-2026-X1',
    expiryDate: '2029-01-30',
    unitPrice: 0.15,
    geneTarget: 'None',
    status: 'In Stock',
  },
  {
    id: 'INV-007',
    drugName: 'Metoprolol',
    category: 'Beta Blocker',
    stockLevel: 510,
    unit: 'Tablets (50mg)',
    minThreshold: 100,
    batchNo: 'MTP-2026-F5',
    expiryDate: '2028-04-18',
    unitPrice: 0.65,
    geneTarget: 'CYP2D6',
    status: 'In Stock',
  },
];

// Initial Ward & Bed Structure
const DEFAULT_WARDS = [
  {
    wardId: 'WARD-ICU',
    name: 'Intensive Care Unit (ICU)',
    floor: '3rd Floor, Wing A',
    totalBeds: 12,
    occupiedBeds: 8,
    beds: [
      { bedId: 'ICU-B01', status: 'Occupied', patientId: 'PT-2041', patientName: 'Eric Carlson', assignedAt: '2026-04-10' },
      { bedId: 'ICU-B02', status: 'Occupied', patientId: 'PT-9966', patientName: 'Sarah Jenkins', assignedAt: '2026-04-12' },
      { bedId: 'ICU-B03', status: 'Available', patientId: null, patientName: null, assignedAt: null },
      { bedId: 'ICU-B04', status: 'Available', patientId: null, patientName: null, assignedAt: null },
      { bedId: 'ICU-B05', status: 'Occupied', patientId: 'pt_2022', patientName: 'Robert Langdon', assignedAt: '2026-04-13' },
      { bedId: 'ICU-B06', status: 'Maintenance', patientId: null, patientName: null, assignedAt: null },
    ],
  },
  {
    wardId: 'WARD-CARDIO',
    name: 'Cardiology Special Care Unit',
    floor: '2nd Floor, Wing B',
    totalBeds: 20,
    occupiedBeds: 14,
    beds: [
      { bedId: 'CRD-B01', status: 'Occupied', patientId: 'PTC526355978', patientName: 'Arthur Vance', assignedAt: '2026-04-11' },
      { bedId: 'CRD-B02', status: 'Available', patientId: null, patientName: null, assignedAt: null },
      { bedId: 'CRD-B03', status: 'Available', patientId: null, patientName: null, assignedAt: null },
      { bedId: 'CRD-B04', status: 'Occupied', patientId: '11408', patientName: 'Elena Rostova', assignedAt: '2026-04-09' },
    ],
  },
  {
    wardId: 'WARD-GEN',
    name: 'General Inpatient Ward',
    floor: '1st Floor, Wing C',
    totalBeds: 30,
    occupiedBeds: 18,
    beds: [
      { bedId: 'GEN-B01', status: 'Available', patientId: null, patientName: null, assignedAt: null },
      { bedId: 'GEN-B02', status: 'Available', patientId: null, patientName: null, assignedAt: null },
      { bedId: 'GEN-B03', status: 'Occupied', patientId: 'PT_TEST_01', patientName: 'David Miller', assignedAt: '2026-04-14' },
    ],
  },
];

const EditSchema = new mongoose.Schema(
  {
    fieldKey: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    editedBy: { type: String, required: true },
    editorEmail: { type: String, default: '' },
    note: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const NoteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    author: { type: String, required: true },
    authorEmail: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const AuditLogSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true },
    role: { type: String, required: true },
    hospital_id: { type: String, required: true },
    patient_id: { type: String, required: true },
    action: { type: String, required: true },
    ai_suggestion: { type: String, default: '' },
    final_decision: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
    justification: { type: String, default: '' },
    longitudinal_id: { type: String, default: '' },
    source_hospitals: { type: [String], default: [] },
  },
  { _id: false },
);

const PatientRecordSchema = new mongoose.Schema(
  {
    hospitalId: { type: String, required: true, index: true },
    patientId: { type: String, required: true, index: true },
    fields: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    edits: { type: [EditSchema], default: [] },
    notes: { type: [NoteSchema], default: [] },
    auditLogs: { type: [AuditLogSchema], default: [] },
  },
  {
    timestamps: true,
  },
);

PatientRecordSchema.index({ hospitalId: 1, patientId: 1 }, { unique: true });

const PatientRecord = mongoose.model('PatientRecord', PatientRecordSchema);
const streamClients = new Map();

const DEFAULT_ALERT_LOG = [
  {
    time: '10:42:12',
    severity: 'Critical',
    source: 'Telemetry Monitor',
    finding: 'Sustained tachycardia >110 bpm for 18 minutes.',
    action: 'Escalated to attending',
    owner: 'Charge RN',
    state: 'Open',
  },
  {
    time: '10:29:05',
    severity: 'High',
    source: 'Medication Correlator',
    finding: 'Medication-response instability requires immediate reassessment.',
    action: 'Medication review required',
    owner: 'Clinical Pharmacist',
    state: 'In Progress',
  },
];

const DEFAULT_HANDOFF_LOG = [
  { time: '10:46', actor: 'Charge RN', entry: 'Escalation accepted. Continuous monitoring protocol activated.' },
  { time: '10:30', actor: 'Respiratory Therapy', entry: 'Oxygen support reviewed; re-evaluation scheduled in 15 minutes.' },
];

function nowIsoStamp() {
  return new Date().toISOString();
}

function compactTimestamp(value = new Date()) {
  return value.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

function buildPatientDocumentPath(hospitalId, patientId) {
  return path.join(
    PATIENT_DMS_DIR,
    sanitizeToken(hospitalId, 'hospital'),
    `${sanitizeToken(patientId, 'patient')}.json`,
  );
}

async function ensureDmsDirectories() {
  await Promise.all([
    fs.mkdir(TEMP_INTAKE_DIR, { recursive: true }),
    fs.mkdir(PATIENT_DMS_DIR, { recursive: true }),
    fs.mkdir(ERP_DATA_DIR, { recursive: true }),
  ]);
  await initializeErpFiles();
}

async function initializeErpFiles() {
  const inventoryFile = path.join(ERP_DATA_DIR, 'inventory.json');
  const wardsFile = path.join(ERP_DATA_DIR, 'wards.json');
  const appointmentsFile = path.join(ERP_DATA_DIR, 'appointments.json');
  const billingFile = path.join(ERP_DATA_DIR, 'billing.json');

  try {
    const invExists = await readJsonFileOrNull(inventoryFile);
    if (!invExists) {
      await fs.writeFile(inventoryFile, JSON.stringify(DEFAULT_INVENTORY, null, 2), 'utf8');
    }
    const wardsExists = await readJsonFileOrNull(wardsFile);
    if (!wardsExists) {
      await fs.writeFile(wardsFile, JSON.stringify(DEFAULT_WARDS, null, 2), 'utf8');
    }
    const appExists = await readJsonFileOrNull(appointmentsFile);
    if (!appExists) {
      await fs.writeFile(appointmentsFile, JSON.stringify([], null, 2), 'utf8');
    }
    const billExists = await readJsonFileOrNull(billingFile);
    if (!billExists) {
      await fs.writeFile(billingFile, JSON.stringify([], null, 2), 'utf8');
    }
  } catch (err) {
    console.warn('Failed to initialize ERP files:', err);
  }
}

async function readJsonFileOrNull(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }
    return null;
  }
}

async function writeJsonFile(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(temp, filePath);
}

function parseBooleanQuery(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }

  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  return fallback;
}

function readHeader(req, key) {
  const value = req.headers[key.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return typeof value === 'string' ? value : '';
}

function resolveAuthContext(req) {
  const hospitalIdRaw = readHeader(req, 'x-pharmaco-hospital-id') || req.query.hospitalId || 'H1';
  const userIdRaw = readHeader(req, 'x-pharmaco-user-id') || req.query.userId || 'GUEST_USER';
  const roleRaw = (readHeader(req, 'x-pharmaco-role') || req.query.role || 'doctor').toString().trim().toLowerCase();
  const usernameRaw = readHeader(req, 'x-pharmaco-username') || req.query.username || 'staff';
  const demoRaw = readHeader(req, 'x-pharmaco-demo-mode') || req.query.demoMode || '';

  const hospitalId = sanitizeToken(hospitalIdRaw, 'H1');
  const userId = sanitizeToken(userIdRaw, 'DOC_01');
  const isDemo = parseBooleanQuery(demoRaw, roleRaw === 'demo');
  const role = isDemo ? 'demo' : (SUPPORTED_ROLES.has(roleRaw) ? roleRaw : 'doctor');
  const username = sanitizeToken(usernameRaw || userId, userId || 'staff');

  return {
    hospitalId,
    userId,
    role,
    username,
    isDemo,
  };
}

function roleAllowed(role, allowedRoles) {
  if (role === 'demo' || role === 'admin') {
    return true;
  }
  return allowedRoles.includes(role);
}

function classifyFieldKey(fieldKey) {
  const key = String(fieldKey || '').trim().toLowerCase();

  if (!key) {
    return 'unknown';
  }

  if (key.startsWith('vitals_') || key === 'manual_alertlog' || key === 'manual_handofflog') {
    return 'vitals';
  }

  if (key.startsWith('labs_') || key.startsWith('lab_')) {
    return 'labs';
  }

  if (key.startsWith('medication_') || key.startsWith('prescription_') || key === 'currentmedications') {
    return 'medications';
  }

  if (key.startsWith('manual_') || key.startsWith('observation_') || key.startsWith('patient_')) {
    return 'nonMedication';
  }

  return 'nonMedication';
}

function canEditFieldByRole(role, fieldKey) {
  if (role === 'demo' || role === 'admin') {
    return true;
  }

  const category = classifyFieldKey(fieldKey);

  if (role === 'doctor') {
    return category !== 'vitals' && category !== 'labs';
  }

  if (role === 'nurse') {
    return category === 'vitals' || category === 'nonMedication';
  }

  if (role === 'lab_technician') {
    return category === 'labs';
  }

  return false;
}

function buildAuditLogEntry(authContext, patientId, action, options = {}) {
  return {
    user_id: authContext.userId,
    role: authContext.role,
    hospital_id: authContext.hospitalId,
    patient_id: patientId,
    action,
    ai_suggestion: options.aiSuggestion || '',
    final_decision: options.finalDecision || '',
    timestamp: new Date(),
    justification: options.justification || '',
  };
}

function toStorageRelativePath(filePath) {
  const relativePath = path.relative(STORAGE_ROOT_DIR, filePath);
  return relativePath.split(path.sep).join('/');
}

async function loadLongitudinalMapping() {
  try {
    const mappingPath = path.resolve(__dirname, '../src/data/longitudinal-mapping.json');
    const raw = await readJsonFileOrNull(mappingPath);
    if (!raw || !Array.isArray(raw.demoPatients)) {
      return {};
    }
    const result = {};
    raw.demoPatients.forEach((patient) => {
      if (patient.longitudinalId && Array.isArray(patient.mappings)) {
        result[patient.longitudinalId] = patient;
      }
    });
    return result;
  } catch (error) {
    console.warn('Failed to load longitudinal mapping:', error?.message || error);
    return {};
  }
}

function streamKey(hospitalId, patientId) {
  return `${sanitizeToken(hospitalId, 'hospital')}::${sanitizeToken(patientId, 'patient')}`;
}

function getClients(hospitalId, patientId) {
  const key = streamKey(hospitalId, patientId);
  if (!streamClients.has(key)) {
    streamClients.set(key, new Set());
  }

  return streamClients.get(key);
}

function toResponsePayload(record) {
  if (!record) {
    return null;
  }

  const fields = record.fields instanceof Map ? Object.fromEntries(record.fields.entries()) : (record.fields || {});

  return {
    hospitalId: record.hospitalId,
    patientId: record.patientId,
    fields,
    edits: record.edits ?? [],
    notes: record.notes ?? [],
    auditLogs: record.auditLogs ?? [],
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    folderLocation: record.folderLocation,
  };
}

/**
 * Universal Patient Loader: First queries DB if available, fallback/augments with individual patient folder on disk.
 */
async function getCompletePatientRecord(hospitalId, patientId) {
  // First try individual patient folder (ground truth storage)
  const folderRecord = await loadPatientFromFolder(hospitalId, patientId);

  if (databaseReady) {
    try {
      const dbRecord = await PatientRecord.findOne({ hospitalId, patientId });
      if (dbRecord) {
        const payload = toResponsePayload(dbRecord);
        // Merge with folder if folder has richer sub-data
        if (folderRecord) {
          payload.folderLocation = folderRecord.folderLocation;
          if (folderRecord.fields?.prescriptions?.length) {
            payload.fields.prescriptions = folderRecord.fields.prescriptions;
          }
          if (folderRecord.fields?.labReports?.length) {
            payload.fields.labReports = folderRecord.fields.labReports;
          }
          if (folderRecord.fields?.reportDocuments?.length) {
            payload.fields.reportDocuments = folderRecord.fields.reportDocuments;
          }
          if (folderRecord.fields?.vitalsLog?.length) {
            payload.fields.vitalsLog = folderRecord.fields.vitalsLog;
          }
        }
        return payload;
      }
    } catch (err) {
      console.warn('DB lookup failed, falling back to folder record:', err.message);
    }
  }

  if (folderRecord) {
    return toResponsePayload(folderRecord);
  }

  return null;
}

/**
 * Universal Patient Saver: Saves atomically to the patient's individual folder on disk AND MongoDB.
 */
async function saveCompletePatientRecord({
  hospitalId,
  patientId,
  fields = {},
  edits = [],
  notes = [],
  auditLogs = [],
  status = 'admitted',
  authContext = null,
}) {
  // 1. Save to patient individual folder on disk
  const savedFolder = await savePatientToFolder({
    hospitalId,
    patientId,
    fields,
    edits,
    notes,
    auditLogs,
    status,
  });

  // 2. Save/Sync to MongoDB if database is available
  if (databaseReady) {
    try {
      await PatientRecord.findOneAndUpdate(
        { hospitalId, patientId },
        {
          $set: {
            hospitalId,
            patientId,
            fields: savedFolder.fields,
            edits: savedFolder.edits,
            notes: savedFolder.notes,
            auditLogs: savedFolder.auditLogs,
          },
        },
        { upsert: true, returnDocument: 'after' },
      );
    } catch (err) {
      console.warn('MongoDB sync failed, patient saved safely in individual folder on disk:', err.message);
    }
  }

  return savedFolder;
}

async function emitRecord(hospitalId, patientId) {
  const clients = getClients(hospitalId, patientId);
  if (!clients.size) {
    return;
  }

  const record = await getCompletePatientRecord(hospitalId, patientId);
  const payload = JSON.stringify({ type: 'record', data: record });

  clients.forEach((res) => {
    res.write(`data: ${payload}\n\n`);
  });
}

function parseNumberValue(value) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value !== 'string') {
    return 0;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function parseArrayField(value, fallback) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return fallback;
    }
  }

  return fallback;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeSeverityCount(alerts) {
  return alerts.reduce(
    (accumulator, row) => {
      const severity = String(row?.severity || 'Moderate').toLowerCase();
      if (severity.includes('critical')) {
        accumulator.critical += 1;
      } else if (severity.includes('high')) {
        accumulator.high += 1;
      } else {
        accumulator.moderate += 1;
      }

      return accumulator;
    },
    { critical: 0, high: 0, moderate: 0 },
  );
}

function generateAiClinicalRecordLog(fields, edits = [], notes = []) {
  const alerts = parseArrayField(fields.manual_alertLog, DEFAULT_ALERT_LOG);
  const handoffs = parseArrayField(fields.manual_handoffLog, DEFAULT_HANDOFF_LOG);
  const severity = String(fields.severity || 'high').toLowerCase();
  const confidence = parseNumberValue(fields.confidence || 0.92);
  const severityCount = normalizeSeverityCount(alerts);
  const latestEdit = edits.length ? edits[edits.length - 1] : null;
  const latestNote = notes.length ? notes[notes.length - 1] : null;

  const now = new Date().toISOString();
  const primaryConfidence = Number(Math.max(0.91, Math.min(0.98, confidence + (severityCount.critical ? 0.02 : 0))).toFixed(2));
  const workflowConfidence = Number(Math.max(0.91, Math.min(0.97, 0.91 + severityCount.high * 0.01)).toFixed(2));
  const editConfidence = Number(Math.max(0.91, Math.min(0.95, latestEdit ? 0.93 : 0.91)).toFixed(2));

  return [
    {
      timestamp: now,
      statement:
        severity === 'critical'
          ? 'Clinical instability remains active and requires immediate multidisciplinary response.'
          : 'Clinical risk remains active and requires continued monitored intervention.',
      rationale: `Alert distribution: critical=${severityCount.critical}, high=${severityCount.high}, moderate=${severityCount.moderate}.`,
      confidence: primaryConfidence,
    },
    {
      timestamp: now,
      statement: 'Escalation workflow remains aligned with active alert burden and handoff trail.',
      rationale: `Handoff entries: ${handoffs.length}. Latest handoff actor: ${handoffs[0]?.actor || 'N/A'}.`,
      confidence: workflowConfidence,
    },
    {
      timestamp: now,
      statement: latestEdit
        ? `Manual override detected on ${latestEdit.fieldKey}; record integrity maintained with attribution.`
        : 'No manual overrides detected in the current monitoring interval.',
      rationale: latestNote
        ? `Latest clinical note by ${latestNote.author}: ${latestNote.text}`
        : 'No additional clinician note attached in current interval.',
      confidence: editConfidence,
    },
  ];
}

function normalizeTextValue(value, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  return value.trim();
}

function normalizeDateInput(value, fallback = '') {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }

  const candidate = value.trim();
  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toISOString().slice(0, 10);
}

function calculateAgeFromDobValue(dateOfBirth) {
  if (!dateOfBirth || typeof dateOfBirth !== 'string') {
    return null;
  }

  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function deriveFieldsFromIntake(intakeOutput, intakeInput = {}, existingFields = {}, authContext = null) {
  const safeInput = intakeInput && typeof intakeInput === 'object' ? intakeInput : {};
  const capturedAt = normalizeTextValue(safeInput.capturedAt, nowIsoStamp());
  const dateOfBirth = normalizeDateInput(safeInput.dateOfBirth, normalizeDateInput(existingFields.dateOfBirth, ''));
  const derivedAge = calculateAgeFromDobValue(dateOfBirth);
  const explicitAge = normalizeTextValue(safeInput.patientAge, normalizeTextValue(existingFields.age, ''));
  const patientAge = explicitAge || (derivedAge !== null ? String(derivedAge) : '');
  const selectedMedications = Array.isArray(safeInput.selectedMedications)
    ? safeInput.selectedMedications.map((entry) => String(entry || '').trim()).filter(Boolean)
    : [];

  const confidence = intakeOutput
    ? parseNumberValue(intakeOutput?.risk_assessment?.confidence_score)
    : parseNumberValue(existingFields.confidence || 0.92);
  const severity = intakeOutput
    ? String(intakeOutput?.risk_assessment?.severity || 'high').toLowerCase()
    : String(existingFields.severity || 'high').toLowerCase();
  const riskLabel = intakeOutput
    ? String(intakeOutput?.risk_assessment?.risk_label || 'Toxic Interaction Risk')
    : String(existingFields.riskLabel || 'Toxic Interaction Risk');
  const variantCount = intakeOutput
    ? parseNumberValue(intakeOutput?.quality_metrics?.variant_line_count)
    : parseNumberValue(existingFields.variantCount || 58);

  const pulse = Math.min(136, 76 + Math.round(variantCount / 2));
  const spo2 = Math.max(90, 98 - Math.round(variantCount / 20));
  const respiratoryRate = Math.min(30, 16 + Math.round(variantCount / 12));
  const systolic = Math.min(162, 120 + Math.round(variantCount / 5));
  const diastolic = Math.min(102, 80 + Math.round(variantCount / 8));
  const wbc = 7600 + Math.round(variantCount * 12);
  const rbc = Number(Math.max(3.8, 5.1 - variantCount / 400).toFixed(2));

  const manualAlertLog = parseArrayField(existingFields.manual_alertLog, DEFAULT_ALERT_LOG);
  const manualHandoffLog = parseArrayField(existingFields.manual_handoffLog, DEFAULT_HANDOFF_LOG);

  const createdBy = normalizeTextValue(existingFields.createdBy, authContext?.userId || '');
  const createdAt = normalizeTextValue(existingFields.createdAt, nowIsoStamp());

  const mergedFields = {
    ...existingFields,
    patientName: normalizeTextValue(safeInput.fullName, normalizeTextValue(existingFields.patientName, '')),
    fullName: normalizeTextValue(safeInput.fullName, normalizeTextValue(existingFields.fullName, '')),
    dateOfBirth,
    age: patientAge,
    gender: normalizeTextValue(safeInput.gender, normalizeTextValue(existingFields.gender, '')),
    sexAtBirth: normalizeTextValue(safeInput.sexAtBirth, normalizeTextValue(existingFields.sexAtBirth, '')),
    phoneNumber: normalizeTextValue(safeInput.phoneNumber, normalizeTextValue(existingFields.phoneNumber, '')),
    email: normalizeTextValue(safeInput.email, normalizeTextValue(existingFields.email, '')),
    city: normalizeTextValue(safeInput.city, normalizeTextValue(existingFields.city, '')),
    state: normalizeTextValue(safeInput.state, normalizeTextValue(existingFields.state, '')),
    country: normalizeTextValue(safeInput.country, normalizeTextValue(existingFields.country, '')),
    emergencyContactName: normalizeTextValue(
      safeInput.emergencyContactName,
      normalizeTextValue(existingFields.emergencyContactName, ''),
    ),
    emergencyContactRelation: normalizeTextValue(
      safeInput.emergencyContactRelation,
      normalizeTextValue(existingFields.emergencyContactRelation, ''),
    ),
    emergencyContactPhone: normalizeTextValue(
      safeInput.emergencyContactPhone,
      normalizeTextValue(existingFields.emergencyContactPhone, ''),
    ),
    hospitalId: authContext?.hospitalId || normalizeTextValue(safeInput.hospitalId, normalizeTextValue(existingFields.hospitalId, 'H1')),
    assignedDoctor: normalizeTextValue(safeInput.assignedDoctor, normalizeTextValue(existingFields.assignedDoctor, '')),
    department: normalizeTextValue(safeInput.department, normalizeTextValue(existingFields.department, 'General Medicine')),
    admissionType: normalizeTextValue(safeInput.admissionType, normalizeTextValue(existingFields.admissionType, 'In-Patient')),
    admissionDate: normalizeDateInput(safeInput.admissionDate, normalizeDateInput(existingFields.admissionDate, '')),
    caseType: normalizeTextValue(safeInput.caseType, normalizeTextValue(existingFields.caseType, 'New')),
    createdBy,
    createdAt,
    sourceCapturedAt: capturedAt,
    currentMedications:
      selectedMedications.length > 0
        ? selectedMedications.join(', ')
        : normalizeTextValue(existingFields.currentMedications, ''),
    riskLabel,
    severity,
    confidence: Number(confidence.toFixed(2)),
    verdictAction: intakeOutput?.clinical_recommendation?.action || existingFields.verdictAction || 'Immediate specialist review required',
    primaryGene: intakeOutput?.pharmacogenomic_profile?.primary_gene || existingFields.primaryGene || 'GENE_SYMBOL',
    diplotype: intakeOutput?.pharmacogenomic_profile?.diplotype || existingFields.diplotype || '*x/*y',
    phenotype: intakeOutput?.pharmacogenomic_profile?.phenotype || existingFields.phenotype || 'RM',
    variantCount,
    dataCompleteness:
      intakeOutput?.quality_metrics?.vcf_parsing_success !== undefined
        ? intakeOutput?.quality_metrics?.vcf_parsing_success
          ? 'Parsed'
          : 'Pending parse validation'
        : existingFields.dataCompleteness || 'Pending parse validation',
    sourceFile:
      intakeOutput?.quality_metrics?.file_name || normalizeTextValue(safeInput.sourceFile, existingFields.sourceFile || 'Unknown file'),
    sourceTimestamp: intakeOutput?.timestamp || existingFields.sourceTimestamp || capturedAt || nowIsoStamp(),
    vitals_temperature: severity === 'critical' ? '100.8' : '99.4',
    vitals_bloodPressure: `${systolic}/${diastolic}`,
    vitals_pulse: String(pulse),
    vitals_pulseBaseline: 70,
    vitals_spo2: String(spo2),
    vitals_spo2Baseline: 97.5,
    vitals_respiratoryRate: String(respiratoryRate),
    labs_wbc: wbc,
    labs_wbcBaseline: 6900,
    labs_rbc: rbc,
    labs_rbcBaseline: 5.05,
    manual_alertLog: manualAlertLog,
    manual_handoffLog: manualHandoffLog,
  };

  mergedFields.ai_clinicalRecordLog = generateAiClinicalRecordLog(mergedFields, [], []);

  return mergedFields;
}

function parseReferenceRange(reference) {
  const match = String(reference || '').match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }

  const min = Number(match[1]);
  const max = Number(match[2]);
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return null;
  }

  return { min, max };
}

function buildLabObservationSummary(values, findings) {
  const abnormal = values.filter((row) => {
    const numeric = Number(String(row?.value || '').replace(/[^0-9.-]/g, ''));
    if (!Number.isFinite(numeric)) {
      return false;
    }

    const range = parseReferenceRange(row?.reference || '');
    if (!range) {
      return false;
    }

    return numeric < range.min || numeric > range.max;
  });

  if (!abnormal.length) {
    return `Summary: ${findings}. No abnormal numeric values detected from structured rows. Clinical observations only; no treatment recommendation.`;
  }

  const highlights = abnormal
    .map((row) => `${row.name || 'Marker'}=${row.value || 'N/A'} (ref ${row.reference || 'N/A'})`)
    .join('; ');

  return `Summary: ${findings}. Abnormal values detected: ${highlights}. Clinical observations only; no treatment recommendation.`;
}

function normalizePdfDocument(rawDocument, defaults = {}) {
  if (!rawDocument || typeof rawDocument !== 'object') {
    return null;
  }

  const rawUrl =
    typeof rawDocument.url === 'string'
      ? rawDocument.url.trim()
      : typeof rawDocument.dataUrl === 'string'
        ? rawDocument.dataUrl.trim()
        : '';

  if (!rawUrl || !rawUrl.startsWith('data:application/pdf')) {
    return null;
  }

  const id = sanitizeToken(rawDocument.id || randomUUID(), randomUUID());
  const title = String(rawDocument.title || defaults.title || 'Clinical PDF').trim().slice(0, 160);
  const owner = sanitizeToken(rawDocument.owner || defaults.owner || 'staff', defaults.owner || 'staff');
  const sourceRaw = String(rawDocument.source || defaults.source || 'generated').trim().toLowerCase();
  const source = sourceRaw === 'uploaded' ? 'uploaded' : 'generated';

  const reportKindRaw = String(rawDocument.reportKind || defaults.reportKind || 'lab_report').trim().toLowerCase();
  const reportKind = ['prescription', 'lab_report', 'uploaded_lab'].includes(reportKindRaw) ? reportKindRaw : 'lab_report';

  const linkedReportId =
    typeof rawDocument.linkedReportId === 'string' && rawDocument.linkedReportId.trim()
      ? sanitizeToken(rawDocument.linkedReportId.trim(), '')
      : typeof defaults.linkedReportId === 'string' && defaults.linkedReportId.trim()
        ? sanitizeToken(defaults.linkedReportId.trim(), '')
        : undefined;

  const createdAtCandidate = typeof rawDocument.createdAt === 'string' ? rawDocument.createdAt : defaults.createdAt;
  const createdAt =
    typeof createdAtCandidate === 'string' && !Number.isNaN(Date.parse(createdAtCandidate))
      ? new Date(createdAtCandidate).toISOString()
      : nowIsoStamp();

  return {
    id,
    title,
    url: rawUrl,
    dataUrl: rawUrl,
    createdAt,
    owner,
    source,
    reportKind,
    linkedReportId,
  };
}

// ----------------------------------------------------------------------------
// HEALTH CHECK
// ----------------------------------------------------------------------------
app.get('/api/health', (_, res) => {
  res.json({ ok: true, service: 'pharmaco-realtime-api', databaseReady: true, hybridStorage: true });
});

// Middleware for authentication context injection
app.use('/api', (req, _res, next) => {
  req.authContext = resolveAuthContext(req);
  next();
});

// ----------------------------------------------------------------------------
// ERP PATIENT REGISTRY & MASTER DIRECTORY
// ----------------------------------------------------------------------------
app.get('/api/patients', async (req, res) => {
  const auth = req.authContext;
  const query = String(req.query.query || '').trim().toLowerCase();
  const limitRaw = Number(req.query.limit);
  const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.floor(limitRaw))) : 50;

  try {
    const allPatients = await listAllPatientFolders(auth.hospitalId);

    const filtered = query
      ? allPatients.filter((p) =>
          p.patientId.toLowerCase().includes(query) ||
          p.patientName.toLowerCase().includes(query) ||
          p.department.toLowerCase().includes(query) ||
          p.assignedDoctor.toLowerCase().includes(query)
        )
      : allPatients;

    res.json(filtered.slice(0, limit));
  } catch (err) {
    console.error('Failed to query patient registry:', err);
    res.status(500).json({ message: 'Failed to retrieve patient registry.' });
  }
});

// Register New Patient directly into folder
app.post('/api/patients/register', async (req, res) => {
  const auth = req.authContext;
  const {
    patientId: customPatientId,
    fullName,
    age,
    dateOfBirth,
    gender,
    phoneNumber,
    email,
    department = 'General Medicine',
    assignedDoctor = 'Unassigned',
    admissionType = 'In-Patient',
    emergencyContactName,
    emergencyContactPhone,
    initialDiagnosis = 'Under Evaluation',
  } = req.body || {};

  if (!fullName) {
    res.status(400).json({ message: 'Patient full name is required.' });
    return;
  }

  const patientId = customPatientId ? sanitizeToken(customPatientId) : `PTC${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;

  const now = new Date().toISOString();
  const initialFields = {
    patientName: fullName,
    fullName,
    age: String(age || ''),
    dateOfBirth: dateOfBirth || '',
    gender: gender || 'Unspecified',
    phoneNumber: phoneNumber || '',
    email: email || '',
    department,
    assignedDoctor,
    admissionType,
    admissionStatus: admissionType.toLowerCase().includes('in') ? 'in-patient' : 'out-patient',
    emergencyContactName: emergencyContactName || '',
    emergencyContactPhone: emergencyContactPhone || '',
    initialDiagnosis,
    riskLabel: 'Evaluation Pending',
    severity: 'low',
    confidence: 0.90,
    verdictAction: 'Initial intake registration completed.',
    vitals_temperature: '98.6',
    vitals_bloodPressure: '120/80',
    vitals_pulse: '72',
    vitals_spo2: '98',
    vitals_respiratoryRate: '16',
    vitals_painScore: '0',
    labs_wbc: 7200,
    labs_rbc: 4.8,
    createdAt: now,
    sourceTimestamp: now,
  };

  try {
    const saved = await saveCompletePatientRecord({
      hospitalId: auth.hospitalId,
      patientId,
      fields: initialFields,
      edits: [],
      notes: [
        {
          text: `Patient registered by ${auth.username} (${auth.role}) in department ${department}.`,
          author: auth.username,
          authorEmail: '',
          timestamp: new Date(),
        }
      ],
      auditLogs: [
        buildAuditLogEntry(auth, patientId, 'patient_registered', {
          finalDecision: 'Patient registered in system',
          justification: 'New patient intake created.',
        })
      ],
      status: 'admitted',
      authContext: auth,
    });

    await emitRecord(auth.hospitalId, patientId);
    res.status(201).json(toResponsePayload(saved));
  } catch (err) {
    console.error('Failed to register patient:', err);
    res.status(500).json({ message: 'Failed to create patient folder on disk.' });
  }
});

// Single Patient Record
app.get('/api/patients/:patientId', async (req, res) => {
  const auth = req.authContext;
  const patientId = req.params.patientId.trim();

  try {
    const record = await getCompletePatientRecord(auth.hospitalId, patientId);

    if (!record) {
      res.status(404).json({ message: `Patient folder ${patientId} not found.` });
      return;
    }

    res.json(record);
  } catch (err) {
    console.error(`Error loading patient ${patientId}:`, err);
    res.status(500).json({ message: 'Failed to load patient folder record.' });
  }
});

// Patient Folder File Inspector
app.get('/api/patients/:patientId/folder-files', async (req, res) => {
  const auth = req.authContext;
  const patientId = req.params.patientId.trim();

  try {
    const details = await getPatientFolderDetails(auth.hospitalId, patientId);
    res.json(details);
  } catch (err) {
    console.error('Failed to get folder files:', err);
    res.status(500).json({ message: 'Unable to inspect patient folder.' });
  }
});

// DMS endpoint
app.get('/api/patients/:patientId/dms', async (req, res) => {
  const auth = req.authContext;
  const patientId = req.params.patientId.trim();

  try {
    const folderDetails = await getPatientFolderDetails(auth.hospitalId, patientId);
    const record = await getCompletePatientRecord(auth.hospitalId, patientId);

    res.json({
      patientId,
      permanentDocument: {
        path: folderDetails.folderPath,
        docType: 'patient-folder',
        schemaVersion: 2,
        patientId,
        status: record?.fields?.admissionStatus || 'admitted',
        createdAt: record?.createdAt || nowIsoStamp(),
        updatedAt: record?.updatedAt || nowIsoStamp(),
        dms: {
          source: 'patient-folder-engine',
          totalFiles: folderDetails.totalFiles,
          folderPath: folderDetails.folderPath,
        },
        record: record?.fields,
      },
      temporaryDocuments: [],
      folderDetails,
    });
  } catch (error) {
    console.error('Failed to retrieve patient DMS documents:', error);
    res.status(500).json({ message: 'Unable to retrieve DMS documents.' });
  }
});

// Sync Intake Output to Folder
app.post('/api/patients/:patientId/sync-intake', async (req, res) => {
  const auth = req.authContext;
  const patientId = req.params.patientId.trim();
  const intakeOutput = req.body?.intakeOutput || null;
  const intakeInput = req.body?.intakeInput || null;

  if (!roleAllowed(auth.role, ['doctor', 'admin', 'nurse'])) {
    res.status(403).json({ message: 'Only authorized clinical roles can sync genomic intake outputs.' });
    return;
  }

  try {
    const existing = await getCompletePatientRecord(auth.hospitalId, patientId);
    const existingFields = existing ? existing.fields : {};
    const fields = deriveFieldsFromIntake(intakeOutput, intakeInput, existingFields, auth);

    const auditLogs = [
      ...(existing?.auditLogs || []),
      buildAuditLogEntry(auth, patientId, 'sync_intake', {
        aiSuggestion: String(intakeOutput?.clinical_recommendation?.action || ''),
        finalDecision: 'Intake synchronized to individual patient folder',
        justification: 'Deterministic intake sync completed.',
      }),
    ];

    const saved = await saveCompletePatientRecord({
      hospitalId: auth.hospitalId,
      patientId,
      fields,
      edits: existing?.edits || [],
      notes: existing?.notes || [],
      auditLogs,
      status: 'admitted',
      authContext: auth,
    });

    await emitRecord(auth.hospitalId, patientId);
    res.json(toResponsePayload(saved));
  } catch (error) {
    console.error('Failed to sync intake to patient folder:', error);
    res.status(500).json({ message: 'Unable to persist intake to patient folder.' });
  }
});

// Field Updates (Vitals, Manual Operational Fields, Admissions)
app.patch('/api/patients/:patientId/fields', async (req, res) => {
  const auth = req.authContext;
  const patientId = req.params.patientId.trim();
  const { fieldKey, value, editedBy, editorEmail, note, aiSuggestion, finalDecision, justification } = req.body ?? {};

  if (!patientId || !fieldKey) {
    res.status(400).json({ message: 'patientId and fieldKey are required.' });
    return;
  }

  if (!canEditFieldByRole(auth.role, fieldKey)) {
    res.status(403).json({ message: 'Your role does not have permission to edit this field category.' });
    return;
  }

  try {
    const existing = await getCompletePatientRecord(auth.hospitalId, patientId);
    const existingFields = existing ? existing.fields : {};
    const updatedFields = { ...existingFields, [fieldKey]: value };

    const editorName = typeof editedBy === 'string' && editedBy.trim() ? editedBy.trim() : auth.username;

    const newEdit = {
      fieldKey,
      value,
      editedBy: editorName,
      editorEmail: editorEmail || '',
      note: note || '',
      timestamp: new Date(),
    };

    const newAudit = buildAuditLogEntry(auth, patientId, `field_update:${fieldKey}`, {
      aiSuggestion: typeof aiSuggestion === 'string' ? aiSuggestion : '',
      finalDecision: typeof finalDecision === 'string' ? finalDecision : String(value ?? ''),
      justification: typeof justification === 'string' && justification.trim() ? justification : (note || 'Field updated by authorized role.'),
    });

    const edits = [...(existing?.edits || []), newEdit];
    const auditLogs = [...(existing?.auditLogs || []), newAudit];

    const saved = await saveCompletePatientRecord({
      hospitalId: auth.hospitalId,
      patientId,
      fields: updatedFields,
      edits,
      notes: existing?.notes || [],
      auditLogs,
      authContext: auth,
    });

    await emitRecord(auth.hospitalId, patientId);
    res.json(toResponsePayload(saved));
  } catch (err) {
    console.error('Failed to patch patient fields:', err);
    res.status(500).json({ message: 'Failed to update patient folder.' });
  }
});

// Clinical Notes
app.post('/api/patients/:patientId/notes', async (req, res) => {
  const auth = req.authContext;
  const patientId = req.params.patientId.trim();
  const { text, author, authorEmail } = req.body ?? {};

  if (!roleAllowed(auth.role, ['doctor', 'nurse', 'admin'])) {
    res.status(403).json({ message: 'Only doctor, nurse, and admin roles can add patient notes.' });
    return;
  }

  if (!text || !author) {
    res.status(400).json({ message: 'text and author are required.' });
    return;
  }

  try {
    const existing = await getCompletePatientRecord(auth.hospitalId, patientId);

    const newNote = {
      text,
      author,
      authorEmail: authorEmail || '',
      timestamp: new Date(),
    };

    const newAudit = buildAuditLogEntry(auth, patientId, 'note_add', {
      aiSuggestion: '',
      finalDecision: text,
      justification: `Clinical note appended by ${author} (${auth.role}).`,
    });

    const notes = [...(existing?.notes || []), newNote];
    const auditLogs = [...(existing?.auditLogs || []), newAudit];

    const saved = await saveCompletePatientRecord({
      hospitalId: auth.hospitalId,
      patientId,
      fields: existing?.fields || {},
      edits: existing?.edits || [],
      notes,
      auditLogs,
      authContext: auth,
    });

    await emitRecord(auth.hospitalId, patientId);
    res.json(toResponsePayload(saved));
  } catch (err) {
    console.error('Failed to save patient note:', err);
    res.status(500).json({ message: 'Failed to save note to patient folder.' });
  }
});

// Doctor Prescriptions & Inventory Integration
app.post('/api/patients/:patientId/prescriptions', async (req, res) => {
  const auth = req.authContext;
  const patientId = req.params.patientId.trim();

  if (!roleAllowed(auth.role, ['doctor', 'admin'])) {
    res.status(403).json({ message: 'Only doctor or admin role can create or update prescriptions.' });
    return;
  }

  const diagnosis = typeof req.body?.diagnosis === 'string' ? req.body.diagnosis.trim() : '';
  const medication = typeof req.body?.medication === 'string' ? req.body.medication.trim() : '';
  const dosage = typeof req.body?.dosage === 'string' ? req.body.dosage.trim() : '';
  const instructions = typeof req.body?.instructions === 'string' ? req.body.instructions.trim() : '';
  const aiSuggestion = typeof req.body?.aiSuggestion === 'string' ? req.body.aiSuggestion.trim() : '';
  const finalDecision = typeof req.body?.finalDecision === 'string' ? req.body.finalDecision.trim() : '';
  const justification = typeof req.body?.justification === 'string' ? req.body.justification.trim() : '';

  if (!patientId || !medication || !dosage) {
    res.status(400).json({ message: 'patientId, medication, and dosage are required.' });
    return;
  }

  const prescription = {
    id: randomUUID(),
    patientId,
    diagnosis,
    medication,
    dosage,
    instructions,
    aiSuggestion,
    finalDecision,
    createdAt: nowIsoStamp(),
    createdBy: auth.username,
  };

  const pdfDocument = normalizePdfDocument(req.body?.pdfDocument, {
    title: `Prescription Summary · ${patientId}`,
    owner: auth.username,
    reportKind: 'prescription',
    source: 'generated',
    linkedReportId: prescription.id,
  });

  try {
    const existing = await getCompletePatientRecord(auth.hospitalId, patientId);
    const existingPrescriptions = Array.isArray(existing?.fields?.prescriptions) ? existing.fields.prescriptions : [];
    const existingPdfs = Array.isArray(existing?.fields?.reportDocuments) ? existing.fields.reportDocuments : [];

    const updatedPrescriptions = [prescription, ...existingPrescriptions];
    const updatedPdfs = pdfDocument ? [pdfDocument, ...existingPdfs] : existingPdfs;

    const fields = {
      ...(existing?.fields || {}),
      prescriptions: updatedPrescriptions,
      reportDocuments: updatedPdfs,
      currentMedications: medication,
    };

    const auditLogs = [
      ...(existing?.auditLogs || []),
      buildAuditLogEntry(auth, patientId, 'prescription_save', {
        aiSuggestion,
        finalDecision: finalDecision || medication,
        justification: justification || 'Doctor finalized prescription in individual folder.',
      }),
    ];

    const saved = await saveCompletePatientRecord({
      hospitalId: auth.hospitalId,
      patientId,
      fields,
      edits: existing?.edits || [],
      notes: existing?.notes || [],
      auditLogs,
      authContext: auth,
    });

    // Automatically decrement inventory stock if item exists
    try {
      const invPath = path.join(ERP_DATA_DIR, 'inventory.json');
      const invList = await readJsonFileOrNull(invPath);
      if (Array.isArray(invList)) {
        const matching = invList.find((i) => i.drugName.toLowerCase() === medication.toLowerCase());
        if (matching && matching.stockLevel > 0) {
          matching.stockLevel -= 1;
          await writeJsonFile(invPath, invList);
        }
      }
    } catch (e) {
      console.warn('Inventory auto-decrement error:', e);
    }

    await emitRecord(auth.hospitalId, patientId);
    res.json({
      record: toResponsePayload(saved),
      prescription,
    });
  } catch (err) {
    console.error('Failed to save prescription:', err);
    res.status(500).json({ message: 'Failed to save prescription to patient folder.' });
  }
});

// Lab Technician Reports
app.post('/api/patients/:patientId/lab-reports', async (req, res) => {
  const auth = req.authContext;
  const patientId = req.params.patientId.trim();

  if (!roleAllowed(auth.role, ['lab_technician', 'admin', 'doctor'])) {
    res.status(403).json({ message: 'Only lab technician, doctor, or admin role can author lab reports.' });
    return;
  }

  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : 'Lab Report';
  const sourceType = req.body?.sourceType === 'pdf' ? 'pdf' : 'structured';
  const findings = typeof req.body?.findings === 'string' ? req.body.findings.trim() : '';
  const values = Array.isArray(req.body?.values) ? req.body.values : [];

  if (!patientId || !findings) {
    res.status(400).json({ message: 'patientId and findings are required.' });
    return;
  }

  const aiSummary = buildLabObservationSummary(values, findings);
  const report = {
    id: randomUUID(),
    patientId,
    title,
    sourceType,
    findings,
    values,
    aiSummary,
    createdAt: nowIsoStamp(),
    createdBy: auth.username,
  };

  const pdfDocument = normalizePdfDocument(req.body?.pdfDocument, {
    title: `${title} · ${patientId}`,
    owner: auth.username,
    reportKind: sourceType === 'pdf' ? 'uploaded_lab' : 'lab_report',
    source: sourceType === 'pdf' ? 'uploaded' : 'generated',
    linkedReportId: report.id,
  });

  try {
    const existing = await getCompletePatientRecord(auth.hospitalId, patientId);
    const existingReports = Array.isArray(existing?.fields?.labReports) ? existing.fields.labReports : [];
    const existingPdfs = Array.isArray(existing?.fields?.reportDocuments) ? existing.fields.reportDocuments : [];

    const updatedReports = [report, ...existingReports];
    const updatedPdfs = pdfDocument ? [pdfDocument, ...existingPdfs] : existingPdfs;

    const fields = {
      ...(existing?.fields || {}),
      labReports: updatedReports,
      reportDocuments: updatedPdfs,
    };

    const auditLogs = [
      ...(existing?.auditLogs || []),
      buildAuditLogEntry(auth, patientId, 'lab_report_save', {
        aiSuggestion: aiSummary,
        finalDecision: findings,
        justification: `Lab report stored in patient folder by ${auth.username}.`,
      }),
    ];

    const saved = await saveCompletePatientRecord({
      hospitalId: auth.hospitalId,
      patientId,
      fields,
      edits: existing?.edits || [],
      notes: existing?.notes || [],
      auditLogs,
      authContext: auth,
    });

    await emitRecord(auth.hospitalId, patientId);
    res.json({
      record: toResponsePayload(saved),
      report,
    });
  } catch (err) {
    console.error('Failed to save lab report:', err);
    res.status(500).json({ message: 'Failed to save lab report in patient folder.' });
  }
});

// AI Decision Audit Trail
app.post('/api/patients/:patientId/ai-decisions', async (req, res) => {
  const auth = req.authContext;
  const patientId = req.params.patientId.trim();
  const action = typeof req.body?.action === 'string' ? req.body.action.trim() : 'ai_decision';
  const aiSuggestion = typeof req.body?.aiSuggestion === 'string' ? req.body.aiSuggestion.trim() : '';
  const finalDecision = typeof req.body?.finalDecision === 'string' ? req.body.finalDecision.trim() : '';
  const justification = typeof req.body?.justification === 'string' ? req.body.justification.trim() : '';

  if (!patientId || !finalDecision) {
    res.status(400).json({ message: 'patientId and finalDecision are required.' });
    return;
  }

  try {
    const existing = await getCompletePatientRecord(auth.hospitalId, patientId);
    const auditEntry = buildAuditLogEntry(auth, patientId, action, {
      aiSuggestion,
      finalDecision,
      justification: justification || 'Doctor completed final decision with AI context logged.',
    });

    const auditLogs = [...(existing?.auditLogs || []), auditEntry];

    const saved = await saveCompletePatientRecord({
      hospitalId: auth.hospitalId,
      patientId,
      fields: existing?.fields || {},
      edits: existing?.edits || [],
      notes: existing?.notes || [],
      auditLogs,
      authContext: auth,
    });

    await emitRecord(auth.hospitalId, patientId);
    res.json({
      record: toResponsePayload(saved),
      audit: auditEntry,
    });
  } catch (err) {
    console.error('Failed to record AI decision:', err);
    res.status(500).json({ message: 'Failed to save AI decision in folder.' });
  }
});

// Audit Log Retrieval
app.get('/api/patients/:patientId/audit', async (req, res) => {
  const auth = req.authContext;
  const patientId = req.params.patientId.trim();
  const limit = Number(req.query.limit) || 100;

  try {
    const record = await getCompletePatientRecord(auth.hospitalId, patientId);
    if (!record) {
      res.status(404).json({ message: 'Patient not found.' });
      return;
    }

    const logs = Array.isArray(record.auditLogs) ? [...record.auditLogs] : [];
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json(logs.slice(0, limit));
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch audit log.' });
  }
});

// SSE Realtime Updates
app.get('/api/patients/:patientId/events', async (req, res) => {
  const auth = req.authContext;
  const patientId = req.params.patientId.trim();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const clients = getClients(auth.hospitalId, patientId);
  clients.add(res);

  const initialRecord = await getCompletePatientRecord(auth.hospitalId, patientId);
  res.write(`data: ${JSON.stringify({ type: 'record', data: initialRecord })}\n\n`);

  const keepAlive = setInterval(() => {
    res.write(`event: ping\ndata: ${Date.now()}\n\n`);
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    clients.delete(res);
  });
});

// ----------------------------------------------------------------------------
// ERP MODULE: APPOINTMENTS
// ----------------------------------------------------------------------------
app.get('/api/appointments', async (req, res) => {
  const auth = req.authContext;
  const filePath = path.join(ERP_DATA_DIR, 'appointments.json');
  try {
    const list = (await readJsonFileOrNull(filePath)) || [];
    const patientFilter = req.query.patientId ? String(req.query.patientId).trim() : null;
    const doctorFilter = req.query.doctor ? String(req.query.doctor).trim() : null;

    let results = list;
    if (patientFilter) {
      results = results.filter((a) => a.patientId === patientFilter);
    }
    if (doctorFilter) {
      results = results.filter((a) => a.doctorName.toLowerCase().includes(doctorFilter.toLowerCase()));
    }

    res.json(results.sort((a, b) => new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime()));
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve appointments.' });
  }
});

app.post('/api/appointments', async (req, res) => {
  const auth = req.authContext;
  const filePath = path.join(ERP_DATA_DIR, 'appointments.json');
  const { patientId, patientName, doctorName, department, date, time, reason, type = 'Consultation' } = req.body || {};

  if (!patientId || !doctorName || !date || !time) {
    res.status(400).json({ message: 'patientId, doctorName, date, and time are required.' });
    return;
  }

  const appointment = {
    id: `APT-${Date.now().toString().slice(-6)}`,
    hospitalId: auth.hospitalId,
    patientId,
    patientName: patientName || patientId,
    doctorName,
    department: department || 'General Medicine',
    date,
    time,
    reason: reason || 'Routine Checkup',
    type,
    status: 'Scheduled',
    createdAt: nowIsoStamp(),
    createdBy: auth.username,
  };

  try {
    const list = (await readJsonFileOrNull(filePath)) || [];
    list.unshift(appointment);
    await writeJsonFile(filePath, list);

    // Also link to patient's individual folder
    const patientRec = await getCompletePatientRecord(auth.hospitalId, patientId);
    if (patientRec) {
      const folderApts = Array.isArray(patientRec.fields?.appointments) ? patientRec.fields.appointments : [];
      await saveCompletePatientRecord({
        hospitalId: auth.hospitalId,
        patientId,
        fields: {
          ...patientRec.fields,
          appointments: [appointment, ...folderApts],
        },
        edits: patientRec.edits || [],
        notes: patientRec.notes || [],
        auditLogs: patientRec.auditLogs || [],
        authContext: auth,
      });
      await emitRecord(auth.hospitalId, patientId);
    }

    res.status(201).json(appointment);
  } catch (err) {
    console.error('Failed to create appointment:', err);
    res.status(500).json({ message: 'Failed to book appointment.' });
  }
});

app.patch('/api/appointments/:id', async (req, res) => {
  const auth = req.authContext;
  const id = req.params.id;
  const { status, notes, date, time } = req.body || {};
  const filePath = path.join(ERP_DATA_DIR, 'appointments.json');

  try {
    const list = (await readJsonFileOrNull(filePath)) || [];
    const item = list.find((a) => a.id === id);
    if (!item) {
      res.status(404).json({ message: 'Appointment not found.' });
      return;
    }

    if (status) item.status = status;
    if (notes) item.notes = notes;
    if (date) item.date = date;
    if (time) item.time = time;
    item.updatedAt = nowIsoStamp();

    await writeJsonFile(filePath, list);
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update appointment.' });
  }
});

// ----------------------------------------------------------------------------
// ERP MODULE: BILLING & INVOICING
// ----------------------------------------------------------------------------
app.get('/api/billing', async (req, res) => {
  const auth = req.authContext;
  const filePath = path.join(ERP_DATA_DIR, 'billing.json');
  try {
    const list = (await readJsonFileOrNull(filePath)) || [];
    const patientFilter = req.query.patientId ? String(req.query.patientId).trim() : null;

    let results = list;
    if (patientFilter) {
      results = results.filter((b) => b.patientId === patientFilter);
    }

    res.json(results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve billing invoices.' });
  }
});

app.post('/api/billing', async (req, res) => {
  const auth = req.authContext;
  const filePath = path.join(ERP_DATA_DIR, 'billing.json');
  const {
    patientId,
    patientName,
    items = [],
    insuranceCoverage = 0,
    paymentMethod = 'Cash',
    paymentStatus = 'Pending',
    notes = '',
  } = req.body || {};

  if (!patientId || !items.length) {
    res.status(400).json({ message: 'patientId and at least one line item are required.' });
    return;
  }

  const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0) * (Number(item.quantity) || 1), 0);
  const discount = Number(insuranceCoverage) || 0;
  const totalAmount = Math.max(0, subtotal - discount);

  const invoice = {
    id: `INV-${Date.now().toString().slice(-6)}`,
    hospitalId: auth.hospitalId,
    patientId,
    patientName: patientName || patientId,
    items,
    subtotal: Number(subtotal.toFixed(2)),
    insuranceCoverage: discount,
    totalAmount: Number(totalAmount.toFixed(2)),
    paymentMethod,
    paymentStatus,
    notes,
    createdAt: nowIsoStamp(),
    createdBy: auth.username,
  };

  try {
    const list = (await readJsonFileOrNull(filePath)) || [];
    list.unshift(invoice);
    await writeJsonFile(filePath, list);

    // Link to patient individual folder
    const patientRec = await getCompletePatientRecord(auth.hospitalId, patientId);
    if (patientRec) {
      const folderBills = Array.isArray(patientRec.fields?.billing) ? patientRec.fields.billing : [];
      await saveCompletePatientRecord({
        hospitalId: auth.hospitalId,
        patientId,
        fields: {
          ...patientRec.fields,
          billing: [invoice, ...folderBills],
        },
        edits: patientRec.edits || [],
        notes: patientRec.notes || [],
        auditLogs: patientRec.auditLogs || [],
        authContext: auth,
      });
      await emitRecord(auth.hospitalId, patientId);
    }

    res.status(201).json(invoice);
  } catch (err) {
    console.error('Failed to create billing invoice:', err);
    res.status(500).json({ message: 'Failed to generate invoice.' });
  }
});

app.patch('/api/billing/:id', async (req, res) => {
  const id = req.params.id;
  const { paymentStatus, paymentMethod } = req.body || {};
  const filePath = path.join(ERP_DATA_DIR, 'billing.json');

  try {
    const list = (await readJsonFileOrNull(filePath)) || [];
    const invoice = list.find((b) => b.id === id);
    if (!invoice) {
      res.status(404).json({ message: 'Invoice not found.' });
      return;
    }

    if (paymentStatus) invoice.paymentStatus = paymentStatus;
    if (paymentMethod) invoice.paymentMethod = paymentMethod;
    invoice.updatedAt = nowIsoStamp();

    await writeJsonFile(filePath, list);
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update invoice.' });
  }
});

// ----------------------------------------------------------------------------
// ERP MODULE: PHARMACY & INVENTORY
// ----------------------------------------------------------------------------
app.get('/api/inventory', async (_req, res) => {
  const filePath = path.join(ERP_DATA_DIR, 'inventory.json');
  try {
    const list = (await readJsonFileOrNull(filePath)) || DEFAULT_INVENTORY;
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve pharmacy inventory.' });
  }
});

app.post('/api/inventory/restock', async (req, res) => {
  const auth = req.authContext;
  if (!roleAllowed(auth.role, ['admin', 'lab_technician', 'doctor'])) {
    res.status(403).json({ message: 'Permission denied.' });
    return;
  }

  const { id, addedQuantity, newBatchNo, newExpiryDate } = req.body || {};
  const filePath = path.join(ERP_DATA_DIR, 'inventory.json');

  try {
    const list = (await readJsonFileOrNull(filePath)) || DEFAULT_INVENTORY;
    const item = list.find((i) => i.id === id);
    if (!item) {
      res.status(404).json({ message: 'Inventory item not found.' });
      return;
    }

    item.stockLevel += Number(addedQuantity) || 0;
    if (newBatchNo) item.batchNo = newBatchNo;
    if (newExpiryDate) item.expiryDate = newExpiryDate;
    item.status = item.stockLevel > item.minThreshold ? 'In Stock' : 'Low Stock';
    item.lastRestockedAt = nowIsoStamp();
    item.lastRestockedBy = auth.username;

    await writeJsonFile(filePath, list);
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Failed to restock inventory.' });
  }
});

// ----------------------------------------------------------------------------
// ERP MODULE: WARDS & BEDS
// ----------------------------------------------------------------------------
app.get('/api/wards', async (_req, res) => {
  const filePath = path.join(ERP_DATA_DIR, 'wards.json');
  try {
    const wards = (await readJsonFileOrNull(filePath)) || DEFAULT_WARDS;
    res.json(wards);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve wards.' });
  }
});

app.post('/api/wards/assign', async (req, res) => {
  const auth = req.authContext;
  const { wardId, bedId, patientId, patientName } = req.body || {};
  const filePath = path.join(ERP_DATA_DIR, 'wards.json');

  try {
    const wards = (await readJsonFileOrNull(filePath)) || DEFAULT_WARDS;
    const ward = wards.find((w) => w.wardId === wardId);
    if (!ward) {
      res.status(404).json({ message: 'Ward not found.' });
      return;
    }

    const bed = ward.beds.find((b) => b.bedId === bedId);
    if (!bed) {
      res.status(404).json({ message: 'Bed not found in ward.' });
      return;
    }

    if (patientId) {
      bed.status = 'Occupied';
      bed.patientId = patientId;
      bed.patientName = patientName || patientId;
      bed.assignedAt = nowIsoStamp();
    } else {
      bed.status = 'Available';
      bed.patientId = null;
      bed.patientName = null;
      bed.assignedAt = null;
    }

    ward.occupiedBeds = ward.beds.filter((b) => b.status === 'Occupied').length;
    await writeJsonFile(filePath, wards);

    // Update patient record with new bed assignment
    if (patientId) {
      const patientRec = await getCompletePatientRecord(auth.hospitalId, patientId);
      if (patientRec) {
        await saveCompletePatientRecord({
          hospitalId: auth.hospitalId,
          patientId,
          fields: {
            ...patientRec.fields,
            manual_bedAssignment: `${ward.name} · ${bed.bedId}`,
            assignedWard: ward.name,
            assignedBed: bed.bedId,
          },
          edits: patientRec.edits || [],
          notes: patientRec.notes || [],
          auditLogs: patientRec.auditLogs || [],
          authContext: auth,
        });
        await emitRecord(auth.hospitalId, patientId);
      }
    }

    res.json({ ward, bed });
  } catch (err) {
    console.error('Failed to assign bed:', err);
    res.status(500).json({ message: 'Failed to update bed allocation.' });
  }
});

// ----------------------------------------------------------------------------
// ERP OVERALL STATS
// ----------------------------------------------------------------------------
app.get('/api/erp/stats', async (req, res) => {
  const auth = req.authContext;
  try {
    const [allPatients, inventoryList, wardsList, appointmentsList] = await Promise.all([
      listAllPatientFolders(auth.hospitalId),
      readJsonFileOrNull(path.join(ERP_DATA_DIR, 'inventory.json')).then((r) => r || DEFAULT_INVENTORY),
      readJsonFileOrNull(path.join(ERP_DATA_DIR, 'wards.json')).then((r) => r || DEFAULT_WARDS),
      readJsonFileOrNull(path.join(ERP_DATA_DIR, 'appointments.json')).then((r) => r || []),
    ]);

    const totalBeds = wardsList.reduce((sum, w) => sum + (w.totalBeds || 0), 0);
    const occupiedBeds = wardsList.reduce((sum, w) => sum + (w.occupiedBeds || 0), 0);

    const criticalGenomicRisks = allPatients.filter((p) => p.severity === 'critical' || p.severity === 'high').length;
    const lowStockDrugs = inventoryList.filter((i) => i.stockLevel <= i.minThreshold).length;
    const scheduledAppointmentsToday = appointmentsList.filter((a) => a.status === 'Scheduled').length;

    res.json({
      totalPatients: allPatients.length,
      admittedInPatients: allPatients.filter((p) => p.status === 'admitted').length,
      outPatients: allPatients.filter((p) => p.status !== 'admitted').length,
      bedOccupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
      occupiedBeds,
      totalBeds,
      criticalGenomicRisks,
      lowStockDrugs,
      scheduledAppointmentsToday,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to compile ERP statistics.' });
  }
});

// ----------------------------------------------------------------------------
// LONGITUDINAL IDENTITY (CROSS-HOSPITAL)
// ----------------------------------------------------------------------------
app.get('/api/longitudinal/:longitudinalId', async (req, res) => {
  const auth = req.authContext;
  const longitudinalId = req.params.longitudinalId.trim();

  if (!longitudinalId) {
    res.status(400).json({ message: 'longitudinalId is required.' });
    return;
  }

  const mapping = longitudinalMappingCache?.[longitudinalId];
  if (!mapping) {
    res.status(404).json({ message: 'Longitudinal patient identity not found.' });
    return;
  }

  try {
    const snapshots = [];
    let totalRetrieved = 0;
    let totalUnavailable = 0;

    for (const sourceMapping of mapping.mappings) {
      try {
        const record = await getCompletePatientRecord(sourceMapping.hospitalId, sourceMapping.patientId);

        if (record) {
          totalRetrieved += 1;
          snapshots.push({
            hospitalId: sourceMapping.hospitalId,
            patientId: sourceMapping.patientId,
            record,
            error: undefined,
          });
        } else {
          totalUnavailable += 1;
          snapshots.push({
            hospitalId: sourceMapping.hospitalId,
            patientId: sourceMapping.patientId,
            record: null,
            error: undefined,
          });
        }
      } catch (error) {
        totalUnavailable += 1;
        snapshots.push({
          hospitalId: sourceMapping.hospitalId,
          patientId: sourceMapping.patientId,
          record: null,
          error: 'Failed to retrieve patient record',
        });
      }
    }

    const conflicts = [];
    if (snapshots.length > 1) {
      for (const fieldKey of CONFLICT_CHECK_FIELDS) {
        const fieldValues = [];

        snapshots.forEach((snapshot) => {
          if (snapshot.record && snapshot.record.fields && fieldKey in snapshot.record.fields) {
            fieldValues.push({
              hospitalId: snapshot.hospitalId,
              patientId: snapshot.patientId,
              value: snapshot.record.fields[fieldKey],
            });
          }
        });

        if (fieldValues.length > 1) {
          const uniqueValues = new Set();
          for (const fv of fieldValues) {
            const strVal = JSON.stringify(fv.value);
            uniqueValues.add(strVal);
          }

          if (uniqueValues.size > 1) {
            conflicts.push({
              field: fieldKey,
              status: 'MANUAL_REVIEW_REQUIRED',
              values: fieldValues,
            });
          }
        }
      }
    }

    res.json({
      longitudinalId,
      snapshots,
      conflicts,
      retrievedAt: nowIsoStamp(),
      isDemo: true,
      totalRecordsRetrieved: totalRetrieved,
      totalRecordsUnavailable: totalUnavailable,
    });
  } catch (error) {
    console.error('Unexpected error retrieving longitudinal patient:', error);
    res.status(500).json({ message: 'An unexpected error occurred.' });
  }
});

// Serve frontend static assets
app.use(express.static(DIST_DIR));
app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

// ----------------------------------------------------------------------------
// SERVER STARTUP
// ----------------------------------------------------------------------------
async function start() {
  await ensureDmsDirectories();
  await initializePatientFolders();
  longitudinalMappingCache = await loadLongitudinalMapping();

  app.listen(PORT, () => {
    console.log(`PharmaKon ERP Server running on http://localhost:${PORT}`);
    console.log(`Individual patient folders stored in: ${PATIENT_DMS_DIR}`);
  });

  const connectWithRetry = async () => {
    retryTimer = null;

    try {
      await mongoose.connect(MONGODB_URI);
      databaseReady = true;
      console.log('MongoDB connected successfully.');
    } catch (error) {
      databaseReady = false;
      console.log(`MongoDB connection not available (${error.message}). Running with 100% resilient Patient Folder Storage on disk.`);

      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      retryTimer = setTimeout(connectWithRetry, DB_RETRY_MS);
    }
  };

  mongoose.connection.on('disconnected', () => {
    databaseReady = false;
    if (!retryTimer) {
      retryTimer = setTimeout(() => {
        retryTimer = null;
        connectWithRetry();
      }, DB_RETRY_MS);
    }
  });

  await connectWithRetry();
}

start().catch((error) => {
  console.error('Failed to start ERP server:', error);
  process.exit(1);
});
