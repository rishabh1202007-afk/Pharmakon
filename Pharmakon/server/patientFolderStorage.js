import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_ROOT_DIR = path.resolve(__dirname, '../fastapi_backend/storage');
const PATIENTS_BASE_DIR = path.join(STORAGE_ROOT_DIR, 'patients');

const fileWriteQueue = new Map();

export function sanitizeToken(value, fallback = 'unknown') {
  const normalized = String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_.-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80);

  return normalized || fallback;
}

export function getPatientFolderPath(hospitalId, patientId) {
  const safeHospital = sanitizeToken(hospitalId, 'H1');
  const safePatient = sanitizeToken(patientId, 'patient');
  return path.join(PATIENTS_BASE_DIR, safeHospital, safePatient);
}

export function getLegacyPatientFilePath(hospitalId, patientId) {
  const safeHospital = sanitizeToken(hospitalId, 'H1');
  const safePatient = sanitizeToken(patientId, 'patient');
  return path.join(PATIENTS_BASE_DIR, safeHospital, `${safePatient}.json`);
}

async function runInQueue(queueKey, work) {
  const previous = fileWriteQueue.get(queueKey) ?? Promise.resolve();
  const current = previous
    .catch(() => {})
    .then(work);

  fileWriteQueue.set(queueKey, current);

  try {
    return await current;
  } finally {
    if (fileWriteQueue.get(queueKey) === current) {
      fileWriteQueue.delete(queueKey);
    }
  }
}

async function readJsonOrNull(filePath) {
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

async function writeJsonAtomic(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.${randomUUID().slice(0, 8)}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await fs.rename(tempPath, filePath);
}

/**
 * Initializes and migrates any legacy single-file patient records to individual patient folders.
 */
export async function initializePatientFolders() {
  await fs.mkdir(PATIENTS_BASE_DIR, { recursive: true });

  try {
    const hospitalEntries = await fs.readdir(PATIENTS_BASE_DIR, { withFileTypes: true });

    for (const hospEntry of hospitalEntries) {
      if (hospEntry.isDirectory()) {
        const hospDir = path.join(PATIENTS_BASE_DIR, hospEntry.name);
        const patientFilesOrDirs = await fs.readdir(hospDir, { withFileTypes: true });

        for (const item of patientFilesOrDirs) {
          if (item.isFile() && item.name.endsWith('.json')) {
            const patientIdCandidate = item.name.replace(/\.json$/i, '');
            const filePath = path.join(hospDir, item.name);
            const legacyData = await readJsonOrNull(filePath);

            if (legacyData && (legacyData.record || legacyData.patientId)) {
              const actualPatientId = legacyData.patientId || legacyData.record?.patientId || patientIdCandidate;
              const targetFolder = getPatientFolderPath(hospEntry.name, actualPatientId);

              // Migrate to folder if folder does not have profile yet
              const profilePath = path.join(targetFolder, 'patient_profile.json');
              const exists = await readJsonOrNull(profilePath);
              if (!exists) {
                await migrateLegacyRecordToFolder(hospEntry.name, actualPatientId, legacyData);
              }
            }
          }
        }
      } else if (hospEntry.isFile() && hospEntry.name.endsWith('.json')) {
        // Root level legacy file (e.g. 11408.json, PTC001X31.json)
        const patientIdCandidate = hospEntry.name.replace(/\.json$/i, '');
        const filePath = path.join(PATIENTS_BASE_DIR, hospEntry.name);
        const legacyData = await readJsonOrNull(filePath);
        if (legacyData) {
          const actualPatientId = legacyData.patientId || legacyData.record?.patientId || patientIdCandidate;
          const hospitalId = legacyData.hospitalId || legacyData.record?.hospitalId || 'H1';
          const targetFolder = getPatientFolderPath(hospitalId, actualPatientId);
          const profilePath = path.join(targetFolder, 'patient_profile.json');
          const exists = await readJsonOrNull(profilePath);
          if (!exists) {
            await migrateLegacyRecordToFolder(hospitalId, actualPatientId, legacyData);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Error during patient folder migration:', err);
  }
}

async function migrateLegacyRecordToFolder(hospitalId, patientId, legacyData) {
  const folder = getPatientFolderPath(hospitalId, patientId);
  await fs.mkdir(folder, { recursive: true });

  const record = legacyData.record || legacyData;
  const fields = record.fields || {};
  const edits = record.edits || [];
  const notes = record.notes || [];
  const auditLogs = record.auditLogs || legacyData.auditLogs || [];

  const profile = {
    docType: 'patient-profile',
    schemaVersion: 2,
    hospitalId,
    patientId,
    status: legacyData.status || fields.admissionStatus || 'admitted',
    createdAt: legacyData.createdAt || record.createdAt || new Date().toISOString(),
    updatedAt: legacyData.updatedAt || record.updatedAt || new Date().toISOString(),
    fields,
  };

  const prescriptions = Array.isArray(fields.prescriptions) ? fields.prescriptions : [];
  const labReports = Array.isArray(fields.labReports) ? fields.labReports : [];
  const reportDocuments = Array.isArray(fields.reportDocuments) ? fields.reportDocuments : [];

  const vitalsLog = [
    {
      timestamp: profile.createdAt,
      temperature: fields.vitals_temperature || '98.6',
      bloodPressure: fields.vitals_bloodPressure || '120/80',
      pulse: fields.vitals_pulse || '72',
      spo2: fields.vitals_spo2 || '98',
      respiratoryRate: fields.vitals_respiratoryRate || '16',
      painScore: fields.vitals_painScore || '0',
      recordedBy: 'Intake System',
    }
  ];

  await Promise.all([
    writeJsonAtomic(path.join(folder, 'patient_profile.json'), profile),
    writeJsonAtomic(path.join(folder, 'prescriptions.json'), prescriptions),
    writeJsonAtomic(path.join(folder, 'lab_reports.json'), labReports),
    writeJsonAtomic(path.join(folder, 'clinical_notes.json'), notes),
    writeJsonAtomic(path.join(folder, 'vitals.json'), vitalsLog),
    writeJsonAtomic(path.join(folder, 'audit_trail.json'), auditLogs),
    writeJsonAtomic(path.join(folder, 'documents_meta.json'), reportDocuments),
    writeJsonAtomic(path.join(folder, 'appointments.json'), []),
    writeJsonAtomic(path.join(folder, 'billing.json'), []),
  ]);
}

/**
 * Loads full patient record assembled from the individual patient folder.
 */
export async function loadPatientFromFolder(hospitalId, patientId) {
  const folder = getPatientFolderPath(hospitalId, patientId);
  const queueKey = `patient-folder:${hospitalId}:${patientId}`;

  return runInQueue(queueKey, async () => {
    const profilePath = path.join(folder, 'patient_profile.json');
    let profile = await readJsonOrNull(profilePath);

    if (!profile) {
      // Check legacy single-file fallback
      const legacyPath = getLegacyPatientFilePath(hospitalId, patientId);
      const legacyData = await readJsonOrNull(legacyPath);
      if (legacyData) {
        await migrateLegacyRecordToFolder(hospitalId, patientId, legacyData);
        profile = await readJsonOrNull(profilePath);
      }
    }

    if (!profile) {
      return null;
    }

    const [
      prescriptions,
      labReports,
      notes,
      vitals,
      auditLogs,
      documents,
      appointments,
      billing,
      editsData
    ] = await Promise.all([
      readJsonOrNull(path.join(folder, 'prescriptions.json')).then(r => Array.isArray(r) ? r : []),
      readJsonOrNull(path.join(folder, 'lab_reports.json')).then(r => Array.isArray(r) ? r : []),
      readJsonOrNull(path.join(folder, 'clinical_notes.json')).then(r => Array.isArray(r) ? r : []),
      readJsonOrNull(path.join(folder, 'vitals.json')).then(r => Array.isArray(r) ? r : []),
      readJsonOrNull(path.join(folder, 'audit_trail.json')).then(r => Array.isArray(r) ? r : []),
      readJsonOrNull(path.join(folder, 'documents_meta.json')).then(r => Array.isArray(r) ? r : []),
      readJsonOrNull(path.join(folder, 'appointments.json')).then(r => Array.isArray(r) ? r : []),
      readJsonOrNull(path.join(folder, 'billing.json')).then(r => Array.isArray(r) ? r : []),
      readJsonOrNull(path.join(folder, 'field_edits.json')).then(r => Array.isArray(r) ? r : []),
    ]);

    const fields = {
      ...(profile.fields || {}),
      prescriptions,
      labReports,
      reportDocuments: documents,
      vitalsLog: vitals,
      appointments,
      billing,
    };

    return {
      hospitalId,
      patientId,
      fields,
      edits: editsData.length > 0 ? editsData : (profile.edits || []),
      notes,
      auditLogs,
      status: profile.status || 'admitted',
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      folderLocation: folder,
    };
  });
}

/**
 * Saves or updates all pieces of an individual patient folder atomically.
 */
export async function savePatientToFolder({
  hospitalId,
  patientId,
  fields = {},
  edits = [],
  notes = [],
  auditLogs = [],
  status = 'admitted',
}) {
  const folder = getPatientFolderPath(hospitalId, patientId);
  const queueKey = `patient-folder:${hospitalId}:${patientId}`;

  return runInQueue(queueKey, async () => {
    await fs.mkdir(folder, { recursive: true });

    const now = new Date().toISOString();
    const profilePath = path.join(folder, 'patient_profile.json');
    const existingProfile = await readJsonOrNull(profilePath);

    // Extract sub-collections from fields so they go to dedicated files
    const {
      prescriptions = [],
      labReports = [],
      reportDocuments = [],
      vitalsLog = [],
      appointments = [],
      billing = [],
      ...coreFields
    } = fields;

    const profile = {
      docType: 'patient-profile',
      schemaVersion: 2,
      hospitalId,
      patientId,
      status: status || existingProfile?.status || 'admitted',
      createdAt: existingProfile?.createdAt || now,
      updatedAt: now,
      fields: coreFields,
    };

    // Update vitals history if current vitals are modified
    const currentVitals = {
      timestamp: now,
      temperature: coreFields.vitals_temperature || '98.6',
      bloodPressure: coreFields.vitals_bloodPressure || '120/80',
      pulse: coreFields.vitals_pulse || '72',
      spo2: coreFields.vitals_spo2 || '98',
      respiratoryRate: coreFields.vitals_respiratoryRate || '16',
      painScore: coreFields.vitals_painScore || '0',
      recordedBy: coreFields.lastVitalsRecordedBy || 'Clinical Staff',
    };

    const existingVitals = await readJsonOrNull(path.join(folder, 'vitals.json')) || [];
    const mergedVitals = Array.isArray(vitalsLog) && vitalsLog.length > 0
      ? vitalsLog
      : [currentVitals, ...existingVitals.filter(v => v.timestamp !== currentVitals.timestamp)].slice(0, 100);

    await Promise.all([
      writeJsonAtomic(profilePath, profile),
      writeJsonAtomic(path.join(folder, 'prescriptions.json'), Array.isArray(prescriptions) ? prescriptions : []),
      writeJsonAtomic(path.join(folder, 'lab_reports.json'), Array.isArray(labReports) ? labReports : []),
      writeJsonAtomic(path.join(folder, 'clinical_notes.json'), Array.isArray(notes) ? notes : []),
      writeJsonAtomic(path.join(folder, 'field_edits.json'), Array.isArray(edits) ? edits : []),
      writeJsonAtomic(path.join(folder, 'vitals.json'), mergedVitals),
      writeJsonAtomic(path.join(folder, 'audit_trail.json'), Array.isArray(auditLogs) ? auditLogs : []),
      writeJsonAtomic(path.join(folder, 'documents_meta.json'), Array.isArray(reportDocuments) ? reportDocuments : []),
      writeJsonAtomic(path.join(folder, 'appointments.json'), Array.isArray(appointments) ? appointments : []),
      writeJsonAtomic(path.join(folder, 'billing.json'), Array.isArray(billing) ? billing : []),
    ]);

    // Also write a master combined view for backward compatibility / fast overview
    const combinedRecord = {
      docType: 'patient-record',
      schemaVersion: 2,
      hospitalId,
      patientId,
      status: profile.status,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      folderPath: folder,
      record: {
        hospitalId,
        patientId,
        fields: {
          ...coreFields,
          prescriptions,
          labReports,
          reportDocuments,
          vitalsLog: mergedVitals,
          appointments,
          billing,
        },
        edits,
        notes,
        auditLogs,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      }
    };

    await writeJsonAtomic(path.join(folder, 'patient_master.json'), combinedRecord);

    // Keep legacy path updated as well
    const legacyPath = getLegacyPatientFilePath(hospitalId, patientId);
    await writeJsonAtomic(legacyPath, combinedRecord);

    return {
      hospitalId,
      patientId,
      fields: combinedRecord.record.fields,
      edits,
      notes,
      auditLogs,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      folderLocation: folder,
    };
  });
}

/**
 * Lists all patient folders with metadata for a given hospital.
 */
export async function listAllPatientFolders(hospitalId) {
  const safeHospital = sanitizeToken(hospitalId, 'H1');
  const hospDir = path.join(PATIENTS_BASE_DIR, safeHospital);

  try {
    await fs.mkdir(hospDir, { recursive: true });
    const entries = await fs.readdir(hospDir, { withFileTypes: true });
    const patients = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const patientFolder = path.join(hospDir, entry.name);
        const profile = await readJsonOrNull(path.join(patientFolder, 'patient_profile.json'));
        if (profile) {
          const fields = profile.fields || {};
          patients.push({
            patientId: profile.patientId || entry.name,
            patientName: fields.patientName || fields.fullName || 'Patient ' + (profile.patientId || entry.name),
            age: fields.age || 'Unknown',
            gender: fields.gender || fields.sexAtBirth || 'Unknown',
            department: fields.department || 'General Medicine',
            assignedDoctor: fields.assignedDoctor || 'Unassigned',
            admissionType: fields.admissionType || (profile.status === 'admitted' ? 'In-Patient' : 'Out-Patient'),
            status: profile.status || 'admitted',
            riskLabel: fields.riskLabel || 'Standard',
            severity: fields.severity || 'low',
            sourceFile: fields.sourceFile || null,
            updatedAt: profile.updatedAt || profile.createdAt,
            folderPath: patientFolder,
          });
        }
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        // Check if this patient was already loaded as folder
        const patientIdCandidate = entry.name.replace(/\.json$/i, '');
        const alreadyIn = patients.some(p => p.patientId === patientIdCandidate);
        if (!alreadyIn) {
          const legacy = await readJsonOrNull(path.join(hospDir, entry.name));
          if (legacy) {
            const rec = legacy.record || legacy;
            const fields = rec.fields || {};
            patients.push({
              patientId: legacy.patientId || rec.patientId || patientIdCandidate,
              patientName: fields.patientName || fields.fullName || 'Patient ' + patientIdCandidate,
              age: fields.age || 'Unknown',
              gender: fields.gender || 'Unknown',
              department: fields.department || 'General Medicine',
              assignedDoctor: fields.assignedDoctor || 'Unassigned',
              admissionType: fields.admissionType || 'In-Patient',
              status: legacy.status || 'admitted',
              riskLabel: fields.riskLabel || 'Standard',
              severity: fields.severity || 'low',
              sourceFile: fields.sourceFile || null,
              updatedAt: legacy.updatedAt || legacy.createdAt,
              folderPath: path.join(hospDir, patientIdCandidate),
            });
          }
        }
      }
    }

    return patients.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (err) {
    console.error('Failed to list patient folders:', err);
    return [];
  }
}

/**
 * Returns a list of files present in a patient's individual folder.
 */
export async function getPatientFolderDetails(hospitalId, patientId) {
  const folder = getPatientFolderPath(hospitalId, patientId);
  try {
    const exists = await fs.stat(folder).catch(() => null);
    if (!exists) {
      return { exists: false, folderPath: folder, files: [] };
    }

    const entries = await fs.readdir(folder, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      const fullPath = path.join(folder, entry.name);
      const stat = await fs.stat(fullPath);
      let contentPreview = null;

      if (entry.isFile() && entry.name.endsWith('.json')) {
        const jsonContent = await readJsonOrNull(fullPath);
        contentPreview = jsonContent;
      }

      files.push({
        name: entry.name,
        sizeBytes: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        isDirectory: entry.isDirectory(),
        data: contentPreview,
      });
    }

    return {
      exists: true,
      hospitalId,
      patientId,
      folderPath: folder,
      totalFiles: files.length,
      files,
    };
  } catch (err) {
    console.error(`Failed to get details for folder ${folder}:`, err);
    return { exists: false, folderPath: folder, files: [], error: err.message };
  }
}
