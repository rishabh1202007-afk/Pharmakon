import type {
  AppointmentRecord,
  BillingInvoice,
  ErpStats,
  InventoryItem,
  PatientFolderDetailsResponse,
  PatientRegistryItem,
  WardRecord,
} from '../types/domain';

const rawApiBase = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE = rawApiBase.replace(/\/$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    credentials: 'include',
    ...init,
  });

  if (!response.ok) {
    let errorMsg = `Request failed: ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson?.message) {
        errorMsg = errJson.message;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return (await response.json()) as T;
}

export async function fetchErpStats(): Promise<ErpStats> {
  return request<ErpStats>('/api/erp/stats');
}

export async function fetchInventory(): Promise<InventoryItem[]> {
  return request<InventoryItem[]>('/api/inventory');
}

export async function restockInventory(payload: {
  id: string;
  addedQuantity: number;
  newBatchNo?: string;
  newExpiryDate?: string;
}): Promise<InventoryItem> {
  return request<InventoryItem>('/api/inventory/restock', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function restockInventoryItem(payload: {
  id: string;
  addedQuantity: number;
  newBatchNo?: string;
  newExpiryDate?: string;
}) {
  return restockInventory(payload);
}

export async function fetchWards(): Promise<WardRecord[]> {
  return request<WardRecord[]>('/api/wards');
}

export async function assignWardBed(payload: {
  wardId: string;
  bedId: string;
  patientId: string | null;
  patientName?: string | null;
}): Promise<{ ward: WardRecord; bed: any }> {
  return request('/api/wards/assign', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function assignBedToPatient(payload: {
  wardId: string;
  bedId: string;
  patientId: string | null;
  patientName?: string | null;
}) {
  return assignWardBed(payload);
}

export async function fetchAppointments(patientId?: string, doctor?: string): Promise<AppointmentRecord[]> {
  const params = new URLSearchParams();
  if (patientId) params.set('patientId', patientId);
  if (doctor) params.set('doctor', doctor);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return request<AppointmentRecord[]>(`/api/appointments${suffix}`);
}

export async function createAppointment(payload: {
  patientId: string;
  patientName?: string;
  doctorName: string;
  department?: string;
  date: string;
  time: string;
  reason?: string;
  type?: string;
}): Promise<AppointmentRecord> {
  return request<AppointmentRecord>('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAppointment(
  id: string,
  payload: { status?: string; notes?: string; date?: string; time?: string },
): Promise<AppointmentRecord> {
  return request<AppointmentRecord>(`/api/appointments/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function fetchBillingInvoices(patientId?: string): Promise<BillingInvoice[]> {
  const params = new URLSearchParams();
  if (patientId) params.set('patientId', patientId);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return request<BillingInvoice[]>(`/api/billing${suffix}`);
}

export async function createBillingInvoice(payload: {
  patientId: string;
  patientName?: string;
  items: Array<{ description: string; amount: number; quantity: number }>;
  insuranceCoverage?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  notes?: string;
}): Promise<BillingInvoice> {
  return request<BillingInvoice>('/api/billing', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateBillingInvoice(
  id: string,
  payload: { paymentStatus?: string; paymentMethod?: string },
): Promise<BillingInvoice> {
  return request<BillingInvoice>(`/api/billing/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function fetchPatientRegistry(query = '', limit = 50): Promise<PatientRegistryItem[]> {
  const params = new URLSearchParams();
  if (query) params.set('query', query);
  params.set('limit', String(limit));
  return request<PatientRegistryItem[]>(`/api/patients?${params.toString()}`);
}

export async function fetchPatientFolderDetails(patientId: string): Promise<PatientFolderDetailsResponse> {
  return request<PatientFolderDetailsResponse>(`/api/patients/${encodeURIComponent(patientId)}/folder-files`);
}

export async function fetchPatientFolderFiles(patientId: string) {
  return fetchPatientFolderDetails(patientId);
}

export async function registerNewPatient(payload: {
  patientId?: string;
  fullName: string;
  age?: number | string;
  dateOfBirth?: string;
  gender?: string;
  phoneNumber?: string;
  email?: string;
  department?: string;
  assignedDoctor?: string;
  admissionType?: 'OPD' | 'IPD' | 'Emergency' | string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  initialDiagnosis?: string;
}) {
  return request('/api/patients/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
