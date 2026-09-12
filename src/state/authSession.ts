import hospitalsSeed from '../data/auth/hospitals.json';
import usersSeed from '../data/auth/users.json';

export const AUTH_SESSION_STORAGE_KEY = 'pharmaco.staff.session.v2';

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

export interface StaffCredential {
  user_id: string;
  hospital_id: string;
  role: Exclude<StaffRole, 'demo'>;
  username: string;
  password: string;
  display_name: string;
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

const ROLE_PERMISSIONS: Record<Exclude<StaffRole, 'demo'>, StaffPermission[]> = {
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

function isRole(value: unknown): value is Exclude<StaffRole, 'demo'> {
  return value === 'admin' || value === 'doctor' || value === 'nurse' || value === 'lab_technician';
}

const rawCredentials = Array.isArray(usersSeed) ? usersSeed : [];

export const STAFF_CREDENTIALS: StaffCredential[] = rawCredentials
  .map((entry) => {
    const roleCandidate = typeof entry?.role === 'string' ? entry.role.trim().toLowerCase() : '';
    if (!isRole(roleCandidate)) {
      return null;
    }

    const user_id = typeof entry?.user_id === 'string' ? entry.user_id.trim() : '';
    const hospital_id = typeof entry?.hospital_id === 'string' ? entry.hospital_id.trim() : '';
    const username = typeof entry?.username === 'string' ? entry.username.trim() : '';
    const password = typeof entry?.password === 'string' ? entry.password : '';
    const display_name = typeof entry?.display_name === 'string' ? entry.display_name.trim() : '';

    if (!user_id || !hospital_id || !username || !password || !display_name) {
      return null;
    }

    return {
      user_id,
      hospital_id,
      role: roleCandidate,
      username,
      password,
      display_name,
    };
  })
  .filter(
    (credential): credential is StaffCredential =>
      credential !== null && HOSPITALS.some((hospital) => hospital.hospital_id === credential.hospital_id),
  );

function isMode(value: unknown): value is AuthMode {
  return value === 'authenticated' || value === 'demo';
}

function findHospitalById(hospitalId: string): HospitalOption | null {
  return HOSPITALS.find((hospital) => hospital.hospital_id === hospitalId) ?? null;
}

export function toStaffUser(credential: StaffCredential): StaffUser {
  return {
    user_id: credential.user_id,
    hospital_id: credential.hospital_id,
    role: credential.role,
    username: credential.username,
    display_name: credential.display_name,
    email: `${credential.username}@${credential.hospital_id.toLowerCase()}.pharmaco.local`,
  };
}

export function findCredential(hospitalId: string, username: string, password: string): StaffCredential | null {
  const normalizedUsername = username.trim().toLowerCase();
  return (
    STAFF_CREDENTIALS.find(
      (credential) =>
        credential.hospital_id === hospitalId &&
        credential.username.toLowerCase() === normalizedUsername &&
        credential.password === password,
    ) ?? null
  );
}

export function createDemoUser(hospitalId: string): StaffUser | null {
  const hospital = findHospitalById(hospitalId);
  if (!hospital) {
    return null;
  }

  return {
    user_id: `DEMO_${hospital.hospital_id}`,
    hospital_id: hospital.hospital_id,
    role: 'doctor',
    username: 'product-tour',
    display_name: `Product Tour (${hospital.name})`,
    email: `demo@${hospital.hospital_id.toLowerCase()}.pharmaco.local`,
  };
}

export function hasPermission(session: StaffSession | null, permission: StaffPermission): boolean {
  if (!session) {
    return false;
  }

  if (session.mode === 'demo') {
    return true;
  }

  return ROLE_PERMISSIONS[session.user.role].includes(permission);
}

export function readStoredSession(): StaffSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<StaffSession>;
    if (!parsed || !isMode(parsed.mode)) {
      return null;
    }

    const hospitalId = parsed.hospital?.hospital_id;
    const hospital = typeof hospitalId === 'string' ? findHospitalById(hospitalId) : null;
    if (!hospital) {
      return null;
    }

    const user = parsed.user;
    if (!user || typeof user !== 'object') {
      return null;
    }

    if (
      typeof user.user_id !== 'string' ||
      typeof user.username !== 'string' ||
      typeof user.display_name !== 'string' ||
      typeof user.email !== 'string' ||
      typeof user.hospital_id !== 'string' ||
      !isRole(user.role) ||
      user.hospital_id !== hospital.hospital_id
    ) {
      return null;
    }

    return {
      mode: parsed.mode,
      hospital,
      user,
      startedAt: typeof parsed.startedAt === 'string' ? parsed.startedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function persistSession(session: StaffSession | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function getIdentityHeaders(session: StaffSession | null): Record<string, string> {
  if (!session) {
    return {};
  }

  return {
    'x-pharmaco-user-id': session.user.user_id,
    'x-pharmaco-role': session.mode === 'demo' ? 'demo' : session.user.role,
    'x-pharmaco-hospital-id': session.hospital.hospital_id,
    'x-pharmaco-username': session.user.username,
    'x-pharmaco-demo-mode': String(session.mode === 'demo'),
  };
}
