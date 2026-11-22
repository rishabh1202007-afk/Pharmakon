import hospitalsSeed from '../data/auth/hospitals.json';

export const AUTH_SESSION_STORAGE_KEY = 'pharmaco.staff.session.v3';
export const IS_DEV_MODE = !import.meta.env.PROD && (import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === 'true');

export type StaffRole = 'admin' | 'doctor' | 'nurse' | 'lab_technician' | 'demo';

export type AuthMode = 'authenticated' | 'demo';

export type StaffPermission =
  | 'dashboard:view'
  | 'upload:vcf'
  | 'vitals:edit'
  | 'medication:edit'
  | 'prescription:edit'
  | 'lab:edit'
  | 'lab:upload'
  | 'nonMedication:edit'
  | 'notes:edit'
  | 'reports:view'
  | 'pdf:view'
  | 'ai:insights:view'
  | 'ai:override'
  | 'patient:search';

export interface HospitalOption {
  hospital_id: string;
  name: string;
}

export interface StaffUser {
  user_id: string;
  hospital_id: string;
  role: Exclude<StaffRole, 'demo'>;
  username: string;
  display_name: string;
  email: string;
}

export interface StaffSession {
  mode: AuthMode;
  hospital: HospitalOption;
  user: StaffUser;
  startedAt: string;
}

export const ROLE_PERMISSIONS: Record<Exclude<StaffRole, 'demo'>, StaffPermission[]> = {
  admin: [
    'dashboard:view',
    'upload:vcf',
    'vitals:edit',
    'medication:edit',
    'prescription:edit',
    'lab:edit',
    'lab:upload',
    'nonMedication:edit',
    'notes:edit',
    'reports:view',
    'pdf:view',
    'ai:insights:view',
    'ai:override',
    'patient:search',
  ],
  doctor: [
    'dashboard:view',
    'upload:vcf',
    'medication:edit',
    'prescription:edit',
    'notes:edit',
    'reports:view',
    'pdf:view',
    'ai:insights:view',
    'ai:override',
    'patient:search',
  ],
  nurse: [
    'dashboard:view',
    'vitals:edit',
    'nonMedication:edit',
    'notes:edit',
    'reports:view',
    'pdf:view',
    'ai:insights:view',
    'patient:search',
  ],
  lab_technician: [
    'dashboard:view',
    'lab:upload',
    'lab:edit',
    'reports:view',
    'pdf:view',
    'ai:insights:view',
    'patient:search',
  ],
};

const rawHospitals = Array.isArray(hospitalsSeed) ? hospitalsSeed : [];

export const HOSPITALS: HospitalOption[] = rawHospitals
  .map((entry) => ({
    hospital_id: typeof entry?.hospital_id === 'string' ? entry.hospital_id.trim() : '',
    name: typeof entry?.name === 'string' ? entry.name.trim() : '',
  }))
  .filter((entry) => entry.hospital_id.length > 0 && entry.name.length > 0);

export function hasPermission(session: StaffSession | null, permission: StaffPermission): boolean {
  if (!session) {
    return false;
  }

  if (session.mode === 'demo') {
    return true;
  }

  return ROLE_PERMISSIONS[session.user.role].includes(permission);
}
