import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
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
import cyp2c19GenomicsRouter from './genomics/cyp2c19/routes.js';
import cyp2c19ExplainRouter from './genomics/cyp2c19/explainRoutes.js';
import {
  configureSession,
  verifyAuthMiddleware,
  StaffAccount,
  seedStaffAccountsIfNeeded,
} from './auth.js';

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

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4000', 'http://127.0.0.1:4000'],
    credentials: true,
  })
);
app.use(express.json({ limit: API_JSON_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: API_JSON_BODY_LIMIT }));

// Configure secure server-side sessions
configureSession(app);

// Apply verified server-side authentication middleware to all /api routes
app.use('/api', verifyAuthMiddleware);

// ----------------------------------------------------------------------------
// AUTHENTICATION API ENDPOINTS
// ----------------------------------------------------------------------------
const HOSPITALS_LIST = [
  { hospital_id: 'H1', name: 'Apollo Delhi' },
  { hospital_id: 'H2', name: 'Fortis Mumbai' },
];

app.get('/api/auth/hospitals', (_req, res) => {
  res.json(HOSPITALS_LIST);
});

app.post('/api/auth/login', async (req, res) => {
  const { hospitalId, username, password, demoMode } = req.body || {};
  const isProduction = process.env.NODE_ENV === 'production';

  const isDemoRequest = demoMode === true || demoMode === 'true';
  if (isDemoRequest) {
    if (isProduction) {
      res.status(401).json({ ok: false, message: 'Demo authentication is prohibited in production.' });
      return;
    }
    const hospital = HOSPITALS_LIST.find((h) => h.hospital_id === hospitalId);
    if (!hospital) {
      res.status(400).json({ ok: false, message: 'Please select a valid hospital organization.' });
      return;
    }

    const demoUser = {
      user_id: `DEMO_${hospital.hospital_id}`,
      hospital_id: hospital.hospital_id,
      role: 'doctor',
      username: 'product-tour',
      display_name: `Product Tour (${hospital.name})`,
      email: `demo@${hospital.hospital_id.toLowerCase()}.pharmaco.local`,
      isDemo: true,
    };

    req.session.user = demoUser;
    req.session.save((err) => {
      if (err) {
        res.status(500).json({ ok: false, message: 'Failed to establish session.' });
        return;
      }
      res.json({
        ok: true,
        message: 'Demo mode started successfully.',
        role: 'demo',
        user: demoUser,
        hospital,
      });
    });
    return;
  }

  if (!hospitalId || !username || !password) {
    res.status(400).json({ ok: false, message: 'Hospital, username, and password are required.' });
    return;
  }

  try {
    const normalizedUsername = String(username).trim().toLowerCase();
    const account = await StaffAccount.findOne({ hospitalId, username: normalizedUsername });

    if (!account) {
      res.status(401).json({ ok: false, message: 'Invalid credentials for the selected hospital.' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, account.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ ok: false, message: 'Invalid credentials for the selected hospital.' });
      return;
    }

    const staffUser = {
      user_id: account.userId,
      hospital_id: account.hospitalId,
      role: account.role,
      username: account.username,
      display_name: account.displayName,
      email: account.email,
      isDemo: false,
    };

    req.session.regenerate((err) => {
      if (err) {
        res.status(500).json({ ok: false, message: 'Failed to regenerate session.' });
        return;
      }

      req.session.user = staffUser;
      req.session.save((saveErr) => {
        if (saveErr) {
          res.status(500).json({ ok: false, message: 'Failed to persist session.' });
          return;
        }

        const hospital = HOSPITALS_LIST.find((h) => h.hospital_id === account.hospitalId) || {
          hospital_id: account.hospitalId,
          name: account.hospitalId,
        };

        res.json({
          ok: true,
          message: 'Authenticated successfully.',
          role: staffUser.role,
          user: staffUser,
          hospital,
        });
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ ok: false, message: 'Internal server error during authentication.' });
  }
});

app.get('/api/auth/session', (req, res) => {
  const sessionUser = req.session?.user;
  if (!sessionUser) {
    res.json({ authenticated: false, session: null });
    return;
  }

  const hospital = HOSPITALS_LIST.find((h) => h.hospital_id === sessionUser.hospital_id) || {
    hospital_id: sessionUser.hospital_id,
    name: sessionUser.hospital_id,
  };

  res.json({
    authenticated: true,
    session: {
      mode: sessionUser.isDemo ? 'demo' : 'authenticated',
      hospital,
      user: sessionUser,
      startedAt: new Date().toISOString(),
    },
  });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ ok: false, message: 'Failed to destroy session.' });
      return;
    }
    res.clearCookie('pharmaco.sid');
    res.json({ ok: true, message: 'Logged out successfully.' });
  });
});

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

async function getCompletePatientRecord(hospitalId, patientId) {
  const folderRecord = await loadPatientFromFolder(hospitalId, patientId);

  if (databaseReady) {
    try {
      const dbRecord = await PatientRecord.findOne({ hospitalId, patientId });
      if (dbRecord) {
        const payload = toResponsePayload(dbRecord);
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
  const savedFolder = await savePatientToFolder({
    hospitalId,
    patientId,
    fields,
    edits,
    notes,
    auditLogs,
    status,
  });

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

function normalizeTextValue(value, fallback = '') {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return fallback;
}

function normalizeDateInput(value, fallback = '') {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return fallback;
}

function normalizePdfDocument(pdfInput, defaults) {
  if (!pdfInput || typeof pdfInput !== 'object') {
    return null;
  }
  return {
    id: pdfInput.id || randomUUID(),
    title: pdfInput.title || defaults.title,
    owner: pdfInput.owner || defaults.owner,
    reportKind: pdfInput.reportKind || defaults.reportKind,
    source: pdfInput.source || defaults.source,
    createdAt: pdfInput.createdAt || nowIsoStamp(),
    linkedReportId: pdfInput.linkedReportId || defaults.linkedReportId,
    storagePath: pdfInput.storagePath || '',
  };
}

function deriveFieldsFromIntake(intakeOutput, intakeInput, existingFields = {}, authContext = null) {
  const safeInput = intakeInput || {};
  const dateOfBirth = normalizeDateInput(safeInput.dateOfBirth, normalizeDateInput(existingFields.dateOfBirth, '1980-01-01'));
  const ageNum = Number(safeInput.age || existingFields.age || 42);
  const patientAge = Number.isFinite(ageNum) ? String(ageNum) : '42';

  const riskLabel = intakeOutput?.clinical_recommendation?.risk_label || existingFields.riskLabel || 'Moderate Risk';
  const severity = (intakeOutput?.clinical_recommendation?.severity || existingFields.severity || 'moderate').toLowerCase();

  const variantCount = intakeOutput?.quality_metrics?.variant_line_count !== undefined
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
    riskLabel,
    severity,
    confidence: 0.92,
    verdictAction: intakeOutput?.clinical_recommendation?.action || existingFields.verdictAction || 'Immediate specialist review required',
    primaryGene: intakeOutput?.pharmacogenomic_profile?.primary_gene || existingFields.primaryGene || 'GENE_SYMBOL',
    diplotype: intakeOutput?.pharmacogenomic_profile?.diplotype || existingFields.diplotype || '*x/*y',
    phenotype: intakeOutput?.pharmacogenomic_profile?.phenotype || existingFields.phenotype || 'RM',
    variantCount,
    vitals_temperature: severity === 'critical' ? '100.8' : '99.4',
    vitals_bloodPressure: `${systolic}/${diastolic}`,
    vitals_pulse: String(pulse),
    vitals_respiratoryRate: String(respiratoryRate),
    labs_wbc: wbc,
    labs_rbc: rbc,
    manual_alertLog,
    manual_handoffLog,
  };

  return mergedFields;
}

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
    res.status(500).json({ message: 'Failed to save prescription.' });
  }
});

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

// ERP APPOINTMENTS
app.get('/api/appointments', async (req, res) => {
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

// ERP BILLING
app.get('/api/billing', async (req, res) => {
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

// ERP INVENTORY
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

// ERP WARDS & BEDS
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

// LONGITUDINAL IDENTITY
app.get('/api/longitudinal/:longitudinalId', async (req, res) => {
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

// Register Genomics Routers
app.use('/api/genomics/cyp2c19', cyp2c19GenomicsRouter);
app.use('/api/genomics/cyp2c19', cyp2c19ExplainRouter);

// Serve frontend static assets
app.use(express.static(DIST_DIR));
app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

// SERVER STARTUP
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
      await seedStaffAccountsIfNeeded();
    } catch (error) {
      databaseReady = false;
      console.log(`MongoDB connection not available (${error.message}). Running with resilient Patient Folder Storage on disk.`);

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
