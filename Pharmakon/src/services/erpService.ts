import type {
  AppointmentRecord,
  BillingInvoice,
  ErpStats,
  InventoryItem,
  PatientFolderDetailsResponse,
  PatientRegistryItem,
  WardRecord,
} from '../types/domain';
import { getIdentityHeaders, readStoredSession } from '../state/authSession';

const rawApiBase = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE = rawApiBase.replace(/\/$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const identityHeaders = getIdentityHeaders(readStoredSession());
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...identityHeaders,
      ...(init?.headers || {}),
    },
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

export async function fetchPatientRegistry(query = '', limit = 100): Promise<PatientRegistryItem[]> {
  const params = new URLSearchParams();
  if (query) params.set('query', query);
  params.set('limit', String(limit));
  return request<PatientRegistryItem[]>(`/api/patients?${params.toString()}`);
}

export interface RegisterPatientPayload {
  patientId?: string;
  fullName: string;
  age?: string;
  dateOfBirth?: string;
  gender?: string;
  phoneNumber?: string;
  email?: string;
  department?: string;
  assignedDoctor?: string;
  admissionType?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  initialDiagnosis?: string;
}

export async function registerNewPatient(payload: RegisterPatientPayload) {
  return request('/api/patients/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchPatientFolderFiles(patientId: string): Promise<PatientFolderDetailsResponse> {
  return request<PatientFolderDetailsResponse>(`/api/patients/${encodeURIComponent(patientId)}/folder-files`);
}

export async function fetchAppointments(filters?: { patientId?: string; doctor?: string }): Promise<AppointmentRecord[]> {
  const params = new URLSearchParams();
  if (filters?.patientId) params.set('patientId', filters.patientId);
  if (filters?.doctor) params.set('doctor', filters.doctor);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return request<AppointmentRecord[]>(`/api/appointments${qs}`);
}

export interface CreateAppointmentPayload {
  patientId: string;
  patientName?: string;
  doctorName: string;
  department?: string;
  date: string;
  time: string;
  reason?: string;
  type?: string;
}

export async function createAppointment(payload: CreateAppointmentPayload): Promise<AppointmentRecord> {
  return request<AppointmentRecord>('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAppointment(id: string, payload: Partial<AppointmentRecord>): Promise<AppointmentRecord> {
  return request<AppointmentRecord>(`/api/appointments/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function fetchBillingInvoices(patientId?: string): Promise<BillingInvoice[]> {
  const qs = patientId ? `?patientId=${encodeURIComponent(patientId)}` : '';
  return request<BillingInvoice[]>(`/api/billing${qs}`);
}

export interface CreateBillingPayload {
  patientId: string;
  patientName?: string;
  items: Array<{
    description: string;
    category: string;
    quantity: number;
    amount: number;
  }>;
  insuranceCoverage?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  notes?: string;
}

export async function createBillingInvoice(payload: CreateBillingPayload): Promise<BillingInvoice> {
  return request<BillingInvoice>('/api/billing', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateBillingInvoice(id: string, payload: Partial<BillingInvoice>): Promise<BillingInvoice> {
  return request<BillingInvoice>(`/api/billing/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function fetchInventory(): Promise<InventoryItem[]> {
  return request<InventoryItem[]>('/api/inventory');
}

export async function restockInventoryItem(payload: {
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

export async function fetchWards(): Promise<WardRecord[]> {
  return request<WardRecord[]>('/api/wards');
}

export async function assignBedToPatient(payload: {
  wardId: string;
  bedId: string;
  patientId?: string | null;
  patientName?: string | null;
}): Promise<{ ward: WardRecord; bed: unknown }> {
  return request<{ ward: WardRecord; bed: unknown }>('/api/wards/assign', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
