# PharmaKon Hospital ERP — Architecture & Implementation Plan

## 1. Executive Summary

PharmaKon is a hospital ERP platform built around deterministic pharmacogenomics, real-time clinical decision support, and multi-role collaboration. This document defines the target architecture for role-based access control (RBAC), real-time data synchronization, local file-based patient storage, and state persistence across page refreshes.

The system already contains a working prototype with React (frontend), Express/MongoDB (backend), and SSE-based real-time sync. This plan formalizes the architecture, identifies gaps, and prescribes an incremental implementation path.

---

## 2. System Architecture Overview

### 2.1 High-Level Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (React SPA)                     │
│  ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │ AuthStore │ │ IntakeStore  │ │Dashboard │ │  PatientService   │  │
│  │ (RBAC)   │ │ (Local State)│ │Page      │ │  (Sync + Cache)   │  │
│  └────┬─────┘ └──────┬──────┘ └────┬─────┘ └────────┬──────────┘  │
│       │               │              │                  │            │
│  ┌────┴───────────────┴──────────────┴──────────────────┴────────┐ │
│  │                    State Persistence Layer                      │ │
│  │   localStorage (auth session) | IndexedDB (PDF/lab cache)      │ │
│  │   File System Access API (future) | Session Storage (temp)     │ │
│  └────────────────────────────┬────────────────────────────────────┘ │
└───────────────────────────────┼──────────────────────────────────────┘
                                │ HTTPS / SSE
┌───────────────────────────────┼──────────────────────────────────────┐
│                        API GATEWAY (Express)                       │
│  ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌────────────────────┐  │
│  │ Auth     │ │ RBAC       │ │Patient   │ │  Real-time SSE     │  │
│  │ Middleware│ │ Enforcement│ │ CRUD     │ │  Event Emitter    │  │
│  └────┬─────┘ └─────┬──────┘ └────┬─────┘ └────────┬───────────┘  │
│       │              │              │                  │             │
│  ┌────┴──────────────┴──────────────┴──────────────────┴────────┐ │
│  │                    Storage Abstraction Layer                   │ │
│  │  MongoDB (structured metadata) + File System (DMS documents)  │ │
│  └────────────────────────────┬───────────────────────────────────┘ │
└───────────────────────────────┼─────────────────────────────────────┘
                                │
┌───────────────────────────────┼─────────────────────────────────────┐
│                        PERSISTENCE LAYER                          │
│  ┌────────────────────────────┴───────────────────────────────┐   │
│  │  fastapi_backend/storage/                                  │   │
│  │  ├── patients/                                             │   │
│  │  │   ├── {hospital_id}/                                    │   │
│  │  │   │   ├── {patient_id}.json        ← Patient Record    │   │
│  │  │   │   ├── prescriptions/                                │   │
│  │  │   │   │   └── {prescription_id}.pdf                     │   │
│  │  │   │   ├── lab-reports/                                  │   │
│  │  │   │   │   ├── structured/{report_id}.json              │   │
│  │  │   │   │   └── uploaded/{report_id}.pdf                  │   │
│  │  │   │   └── audit/                                        │   │
│  │  │   │       └── {patient_id}_audit.json                   │   │
│  │  └── temp/intake/                                          │   │
│  │      └── {hospital}__{patient}__{ts}__{uuid}.json          │   │
│  └────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

### 2.2 Design Principles

1. **Deterministic RBAC** — Every mutation is authorized at both the UI and API layers. No client-side-only enforcement.
2. **Real-time propagation** — SSE events broadcast mutations to all authenticated clients viewing the same patient record.
3. **Local-first, server-authoritative** — The client maintains local caches for offline resilience; the server remains the single source of truth.
4. **Patient-folder filesystem** — Each patient has a dedicated folder hierarchy, making backup, migration, and audit straightforward.
5. **State persistence** — Auth sessions, intake outputs, dashboard caches, and PDF artifacts survive page refreshes via localStorage/IndexedDB.

---

## 3. Role-Based Access Control (RBAC)

### 3.1 Role Hierarchy

| Role | Permissions |
|------|-------------|
| **admin** | All permissions |
| **doctor** | dashboard:view, upload:vcf, medication:edit, prescription:edit, notes:edit, reports:view, pdf:view, ai:insights:view, ai:override, patient:search |
| **nurse** | dashboard:view, vitals:edit, nonMedication:edit, notes:edit, reports:view, pdf:view, ai:insights:view, patient:search |
| **lab_technician** | dashboard:view, lab:upload, lab:edit, reports:view, pdf:view, ai:insights:view, patient:search |
| **demo** | All permissions (read-only simulation) |

### 3.2 Permission Enforcement Points

1. **Frontend route guards** — `ProtectedRoute` component checks `can(permission)` before rendering.
2. **UI element guards** — Individual buttons/panels call `can('vitals:edit')` etc. to show/hide controls.
3. **API middleware** — Every `/api/patients/*` endpoint validates the auth context.
4. **Field-level RBAC** — `canEditFieldByRole(role, fieldKey)` restricts which fields each role may modify.

### 3.3 Auth Context Flow

```
LoginPage
  │
  ├─> loginWithCredentials(hospitalId, username, password)
  │     │
  │     ├─> findCredential() → StaffCredential
  │     ├─> toStaffUser() → StaffUser
  │     ├─> persistSession() → localStorage
  │     └─> dispatch({ type: 'SET_SESSION', payload })
  │
  └─> AuthContext.Provider
        │
        ├─> session: StaffSession | null
        ├─> role: StaffRole | null
        ├─> can: (permission) => hasPermission(session, permission)
        └─> hospitals: HospitalOption[]
```

### 3.4 Session Persistence

- **Storage key:** `pharmaco.staff.session.v2`
- **Mechanism:** JSON-serialized `StaffSession` stored in `localStorage`
- **Hydration:** `readStoredSession()` called on app init inside `useReducer` initializer
- **Invalidation:** `signOut()` removes the key; server can invalidate via 401 responses

---

## 4. Real-Time Data Synchronization

### 4.1 SSE Architecture

The server maintains an in-memory `streamClients` map keyed by `hospitalId::patientId`. When a mutation occurs, `emitRecord()` serializes the updated `CloudPatientRecord` and pushes it to all connected SSE clients.

```
Client A (Doctor)               Server                    Client B (Nurse)
     │                            │                            │
     │── GET /api/patients/PT-2041 │                            │
     │<── CloudPatientRecord ─────│                            │
     │                            │                            │
     │── SSE Connect ───────────>│                            │
     │   /api/patients/PT-2041/   │                            │
     │   events?hospitalId=...    │                            │
     │                            │                            │
     │                            │── SSE Connect ────────────>│
     │                            │   /api/patients/PT-2041/   │
     │                            │   events?hospitalId=...    │
     │                            │                            │
     │── PATCH /fields ─────────>│                            │
     │   { fieldKey: "vitals_pulse",                            │
     │     value: "82" }          │                            │
     │                            │                            │
     │                            │── emitRecord() ───────────>│
     │<── SSE: { type:"record",   │   { type:"record",          │
     │          data: {...} } ────│     data: updatedRecord }   │
     │                            │                            │
     │   UI updates               │                            │
     │   automatically            │                            │
```

### 4.2 SSE Client Lifecycle

```typescript
subscribePatientRecord(patientId, onRecord) {
  const streamUrl = `${API_BASE}/api/patients/${patientId}/events?${query}`;
  const events = new EventSource(streamUrl);

  events.onmessage = (event) => {
    const payload = JSON.parse(event.data);
    if (payload.type === 'record') {
      onRecord(payload.data);  // Updates React state
    }
  };

  events.onerror = () => {
    events.close();
    scheduleReconnect(HEALTH_CACHE_TTL_MS);
  };

  return () => { events.close(); }; // Cleanup on unmount
}
```

### 4.3 Conflict Detection

The server tracks `CONFLICT_CHECK_FIELDS` and stores edit history with timestamps. When two users edit the same field concurrently:
1. The latest edit wins (last-write-wins with server-authoritative timestamp)
2. Both edits are preserved in the `edits` array for audit
3. The UI highlights fields that were modified by another user since the page was loaded

### 4.4 Optimistic Updates with Rollback

```typescript
async function updateFieldWithSync(patientId, payload) {
  // 1. Optimistic local update
  setLocalRecord(prev => applyEdit(prev, payload));

  try {
    // 2. Server mutation
    const updated = await updatePatientField(patientId, payload);

    // 3. SSE will confirm; if it deviates, reconcile
    setRecord(updated);
  } catch (error) {
    // 4. Rollback on failure
    setRecord(previousRecord);
    setError(error.message);
  }
}
```

---

## 5. Local File-Based Patient Storage

### 5.1 Directory Structure

```
fastapi_backend/storage/
├── patients/
│   ├── hospital_001/
│   │   ├── PT-2041.json              ← Canonical patient record
│   │   ├── prescriptions/
│   │   │   ├── PT-2041_presc_001.json
│   │   │   └── PT-2041_presc_001.pdf
│   │   ├── lab-reports/
│   │   │   ├── structured/
│   │   │   │   └── PT-2041_lab_001.json
│   │   │   └── uploaded/
│   │   │       └── PT-2041_lab_001.pdf
│   │   └── audit/
│   │       └── PT-2041_audit.json
│   ├── hospital_002/
│   │   └── PT-1001.json
│   └── ...
└── temp/
    └── intake/
        └── {hospital}__{patient}__{ts}__{uuid}.json
```

### 5.2 Patient Record Schema (JSON)

```json
{
  "docType": "patient-record",
  "schemaVersion": 1,
  "hospitalId": "hospital_001",
  "patientId": "PT-2041",
  "createdAt": "2026-01-15T08:30:00Z",
  "updatedAt": "2026-04-02T09:42:00Z",
  "status": "active",
  "dms": {
    "source": "intake-console",
    "intakeHistory": [
      {
        "tempDocumentId": "hospital_001__PT-2041__20260402094200__uuid",
        "tempDocumentPath": "temp/intake/hospital_001__PT-2041__...json",
        "capturedAt": "2026-04-02T09:42:00Z"
      }
    ]
  },
  "record": {
    "fields": {
      "patientName": "John Doe",
      "vitals_temperature": "99.4",
      "riskLabel": "High risk",
      ...
    },
    "edits": [...],
    "notes": [...],
    "auditLogs": [...]
  }
}
```

### 5.3 Atomic Write Pattern

```javascript
async function writeJsonAtomic(filePath, payload) {
  const tempFilePath = `${filePath}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`;
  await fs.writeFile(tempFilePath, JSON.stringify(payload, null, 2), 'utf8');
  await fs.rename(tempFilePath, filePath); // Atomic on same filesystem
}
```

### 5.4 File Write Queue

```javascript
const fileWriteQueue = new Map(); // Serializes writes per patient

async function runInFileQueue(queueKey, work) {
  const previous = fileWriteQueue.get(queueKey) ?? Promise.resolve();
  const current = previous.catch(() => {}).then(work);
  fileWriteQueue.set(queueKey, current);
  try { return await current; }
  finally { if (fileWriteQueue.get(queueKey) === current) fileWriteQueue.delete(queueKey); }
}
```

This prevents concurrent writes to the same patient file from corrupting data.

---

## 6. State Persistence Strategy

### 6.1 Persistence Layers

| Data Type | Client Storage | Server Storage | Persistence Scope |
|-----------|---------------|----------------|-------------------|
| Auth session | `localStorage` | MongoDB (users) | Survives refresh |
| Intake outputs | `localStorage` | File system | Survives refresh |
| Patient field cache | `localStorage` | File system + MongoDB | Session-only |
| PDF documents | IndexedDB | File system | Session + refresh |
| Lab reports | IndexedDB | File system | Session + refresh |
| UI preferences | `localStorage` | None | Survives refresh |

### 6.2 Auth Session Persistence

```typescript
// Auth state initialized from localStorage on app boot
const [state, dispatch] = useReducer(reducer, { session: readStoredSession() });

export function persistSession(session: StaffSession | null): void {
  if (!session) {
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
}
```

### 6.3 Intake Output Persistence

```typescript
const INTAKE_OUTPUTS_KEY = 'pharmaco.intake.outputs';
const MAX_OUTPUT_HISTORY = 30;

function readStoredOutputs(): AiDraftOutput[] {
  const raw = window.localStorage.getItem(INTAKE_OUTPUTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function persistOutputs(outputs: AiDraftOutput[]) {
  window.localStorage.setItem(INTAKE_OUTPUTS_KEY, JSON.stringify(outputs));
}
```

### 6.4 PDF/Lab Report Cache (IndexedDB)

```typescript
const LOCAL_REPORT_CACHE_PREFIX = 'pharmaco.local.reports.v1';
const LOCAL_CACHE_DB_NAME = 'pharmaco.local.cache.db.v1';
const LOCAL_CACHE_DB_STORE = 'reportArtifacts';

interface IndexedReportCacheRecord {
  cacheKey: string;
  updatedAt: string;
  pdfDocuments: PdfViewerDocument[];
  labReports: DashboardLabArtifact[];
}

async function openLocalReportCacheDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    const request = window.indexedDB.open(LOCAL_CACHE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(LOCAL_CACHE_DB_STORE)) {
        db.createObjectStore(LOCAL_CACHE_DB_STORE, { keyPath: 'cacheKey' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}
```

### 6.5 Refresh Resilience Protocol

```
Page Load
  │
  ├─> 1. Read auth session from localStorage
  │     └─> If valid, restore session; else redirect to /login
  │
  ├─> 2. Hydrate intake outputs from localStorage
  │     └─> Populate IntakeStore with last 30 outputs
  │
  ├─> 3. Restore dashboard caches from IndexedDB
  │     └─> Merge with server data when API responds
  │
  ├─> 4. Re-establish SSE connections for active patients
  │     └─> subscribePatientRecord() with auto-reconnect
  │
  └─> 5. Verify server version matches local cache
        └─> If server has newer data, merge; if local has uncommitted
            changes, prompt user to re-sync
```

---

## 7. Data Flow: Multi-Role Collaboration

### 7.1 Scenario: Doctor Updates Prescription, Nurse Sees It

```
1. Doctor opens PT-2041 dashboard
   └─> GET /api/patients/PT-2041
   └─> SSE connected: /api/patients/PT-2041/events

2. Doctor edits prescription
   └─> POST /api/patients/PT-2041/prescriptions
       { medication: "Escitalopram", dosage: "10mg" }

3. Server:
   └─> Saves prescription to:
       - MongoDB PatientRecord (metadata)
       - File system: patients/hospital_001/PT-2041/prescriptions/PT-2041_presc_001.pdf
   └─> Appends audit log entry
   └─> Calls emitRecord(hospitalId, patientId)
       └─> SSE pushes to ALL connected clients for PT-2041

4. Nurse (already viewing PT-2041):
   └─> Receives SSE event: { type: "record", data: updatedRecord }
   └─> React state updates automatically
   └─> UI re-renders with new prescription visible

5. Lab technician (also viewing PT-2041):
   └─> Same SSE event delivered
   └─> Sees updated record but cannot edit prescription (RBAC)
```

### 7.2 Offline Resilience

If the server is unreachable:
1. Client continues operating on cached data
2. Mutations are queued locally with `localStorage` flags
3. Background sync attempts reconnection every 30 seconds
4. On reconnection, queued mutations are flushed to the server
5. Server recalculates state from authoritative files

---

## 8. API Contract

### 8.1 Authentication Headers

```
x-pharmaco-user-id: doc1
x-pharmaco-role: doctor
x-pharmaco-hospital-id: hospital_001
x-pharmaco-username: doc1
x-pharmaco-demo-mode: false
```

### 8.2 Core Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/patients` | patient:search | Search patients by query |
| GET | `/api/patients/:id` | dashboard:view | Fetch patient record |
| PATCH | `/api/patients/:id/fields` | varies by field | Update patient fields |
| POST | `/api/patients/:id/notes` | notes:edit | Add clinical note |
| POST | `/api/patients/:id/prescriptions` | prescription:edit | Save prescription |
| POST | `/api/patients/:id/lab-reports` | lab:edit | Save lab report |
| POST | `/api/patients/:id/sync-intake` | doctor, admin | Sync genomic intake |
| GET | `/api/patients/:id/dms` | dashboard:view | Get DMS document tree |
| GET | `/api/patients/:id/audit` | dashboard:view | Fetch audit log |
| SSE | `/api/patients/:id/events` | dashboard:view | Real-time updates |

---

## 9. Implementation Phases

### Phase 1: RBAC Foundation (Week 1-2)
- [ ] Finalize permission matrix in `authSession.ts`
- [ ] Implement `ProtectedRoute` with permission-based redirects
- [ ] Add field-level RBAC checks in `DashboardPage.tsx`
- [ ] Create role-specific dashboard layouts
- [ ] Unit tests for `hasPermission()` and `canEditFieldByRole()`

### Phase 2: Real-Time Sync (Week 3-4)
- [ ] Implement SSE endpoint `/api/patients/:id/events`
- [ ] Build `streamClients` map with hospital-scoped keys
- [ ] Create `emitRecord()` broadcaster
- [ ] Implement `subscribePatientRecord()` client with auto-reconnect
- [ ] Add conflict detection UI indicators
- [ ] Load test with 50 concurrent SSE connections

### Phase 3: File-Based Storage (Week 5-6)
- [ ] Implement patient folder hierarchy in `server/index.js`
- [ ] Add atomic write pattern (`writeJsonAtomic`)
- [ ] Build file write queue (`runInFileQueue`)
- [ ] Migrate MongoDB patient records to file-backed storage
- [ ] Add backup/restore scripts for patient folders
- [ ] Implement intake temp document lifecycle

### Phase 4: State Persistence (Week 7-8)
- [ ] Audit all React state for persistence needs
- [ ] Implement `localStorage` hydration for auth, intake, preferences
- [ ] Implement IndexedDB cache for PDFs and lab reports
- [ ] Add refresh resilience tests (simulate reload, verify state)
- [ ] Implement optimistic update + rollback in all mutation flows
- [ ] Add cache invalidation on server-side mutations

### Phase 5: Integration & Hardening (Week 9-10)
- [ ] End-to-end RBAC tests (each role, each endpoint)
- [ ] Real-time sync stress tests (10 roles, 1 patient)
- [ ] File storage corruption recovery tests
- [ ] State persistence across refresh/close/reopen
- [ ] Performance profiling (SSE latency, file I/O)
- [ ] Security audit (auth bypass, path traversal, injection)

---

## 10. Code Organization

### 10.1 Frontend Structure

```
src/
├── state/
│   ├── authStore.tsx          # Auth context + reducer
│   ├── authSession.ts         # RBAC types, permissions, session I/O
│   ├── intakeStore.tsx        # Intake output persistence
│   └── patientStore.tsx       # NEW: Patient record cache + SSE subscription
├── services/
│   ├── cloudPatientService.ts # API client (existing)
│   ├── patientSyncService.ts  # NEW: SSE subscription manager
│   └── localCacheService.ts   # NEW: IndexedDB/localStorage helpers
├── components/
│   ├── ProtectedRoute.tsx     # Route guard
│   ├── RoleGuard.tsx          # Component-level RBAC
│   └── RealtimeIndicator.tsx  # SSE connection status
├── pages/
│   ├── DashboardPage.tsx
│   ├── LoginPage.tsx
│   └── ...
└── types/
    └── domain.ts
```

### 10.2 Backend Structure

```
server/
├── index.js                   # Main Express app (existing)
├── auth.js                    # NEW: Auth middleware extraction
├── rbac.js                    # NEW: Role-based access enforcement
├── storage/
│   ├── patientStore.js        # NEW: File-based patient CRUD
│   ├── documentQueue.js       # NEW: Write queue management
│   └── backup.js              # NEW: Backup/restore utilities
└── realtime/
    └── sse.js                 # NEW: SSE event emitter
```

---

## 11. Security Considerations

1. **Path Traversal Prevention** — All file paths use `sanitizeToken()` to strip dangerous characters
2. **Auth Enforcement** — Every mutation endpoint validates `resolveAuthContext()` before proceeding
3. **Role Allowlisting** — `roleAllowed()` checks against `SUPPORTED_ROLES` set
4. **Field-Level Authorization** — `canEditFieldByRole()` prevents unauthorized field mutations
5. **Audit Logging** — Every mutation appends to `auditLogs` with user identity, timestamp, and justification
6. **CORS Configuration** — Restrict origins in production
7. **Rate Limiting** — Add express-rate-limit to prevent abuse
8. **Input Sanitization** — All query params and body fields sanitized before processing

---

## 12. Testing Strategy

### 12.1 RBAC Tests

```typescript
describe('RBAC', () => {
  test('doctor can edit medications but not vitals', () => {
    expect(hasPermission(doctorSession, 'medication:edit')).toBe(true);
    expect(hasPermission(doctorSession, 'vitals:edit')).toBe(false);
  });

  test('nurse can edit vitals but not prescriptions', () => {
    expect(hasPermission(nurseSession, 'vitals:edit')).toBe(true);
    expect(hasPermission(nurseSession, 'prescription:edit')).toBe(false);
  });

  test('lab_technician can upload labs but not edit medications', () => {
    expect(hasPermission(labSession, 'lab:upload')).toBe(true);
    expect(hasPermission(labSession, 'medication:edit')).toBe(false);
  });
});
```

### 12.2 Real-Time Sync Tests

```typescript
describe('SSE Sync', () => {
  test('doctor update propagates to nurse', async () => {
    const doctorClient = connectSSE(patientId, doctorSession);
    const nurseClient = connectSSE(patientId, nurseSession);

    await doctorClient.send(PATCH /fields, { fieldKey: 'vitals_pulse', value: '82' });

    const nurseUpdate = await nurseClient.nextMessage();
    expect(nurseUpdate.data.fields.vitals_pulse).toBe('82');
  });
});
```

### 12.3 Persistence Tests

```typescript
describe('State Persistence', () => {
  test('auth session survives page refresh', async () => {
    login(credentials);
    expect(localStorage.getItem(AUTH_SESSION_STORAGE_KEY)).not.toBeNull();

    simulatePageRefresh();
    expect(useAuth().hasActiveSession).toBe(true);
  });

  test('intake outputs persist after refresh', async () => {
    saveOutput(mockOutput);
    const stored = localStorage.getItem(INTAKE_OUTPUTS_KEY);
    expect(JSON.parse(stored)).toContainEqual(expect.objectContaining(mockOutput));
  });
});
```

---

## 13. Monitoring & Observability

| Metric | Collection Point | Alert Threshold |
|--------|-----------------|-----------------|
| SSE connection count | Server `streamClients.size` | > 500 per patient |
| File write latency | `runInFileQueue` timing | > 500ms p99 |
| MongoDB fallback usage | `databaseReady` flag | Any fallback event |
| Auth failure rate | Login attempts | > 10% failure |
| Conflict rate | Concurrent edits | > 5% of mutations |

---

## 14. Conclusion

This architecture delivers:
1. **Deterministic RBAC** enforced at UI, API, and field levels
2. **Real-time sync** via SSE with automatic reconnection and conflict detection
3. **Local file-based storage** organized into per-patient folders with atomic writes
4. **State persistence** across page refreshes via localStorage and IndexedDB
5. **Offline resilience** through optimistic updates, local caching, and background sync

The implementation is staged across 5 phases over 10 weeks, with each phase delivering independently testable functionality. The existing codebase provides a solid foundation; this plan extends it systematically.
