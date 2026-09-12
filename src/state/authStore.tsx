import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
import {
  HOSPITALS,
  createDemoUser,
  findCredential,
  hasPermission,
  persistSession,
  readStoredSession,
  toStaffUser,
  type HospitalOption,
  type StaffPermission,
  type StaffRole,
  type StaffSession,
} from './authSession';

interface AuthState {
  session: StaffSession | null;
}

type AuthAction =
  | { type: 'SET_SESSION'; payload: StaffSession }
  | { type: 'SIGN_OUT' };

interface LoginResult {
  ok: boolean;
  message: string;
  role?: StaffRole;
}

interface AuthContextValue {
  session: StaffSession | null;
  user: StaffSession['user'] | null;
  hospital: HospitalOption | null;
  role: StaffRole | null;
  hospitals: HospitalOption[];
  isAuthenticated: boolean;
  isDemoMode: boolean;
  hasActiveSession: boolean;
  loginWithCredentials: (hospitalId: string, username: string, password: string) => LoginResult;
  enterDemoMode: (hospitalId: string) => LoginResult;
  signOut: () => void;
  can: (permission: StaffPermission) => boolean;
}

function reducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_SESSION':
      return { ...state, session: action.payload };
    case 'SIGN_OUT':
      return { ...state, session: null };
    default:
      return state;
  }
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { session: readStoredSession() });

  const loginWithCredentials = (hospitalId: string, username: string, password: string): LoginResult => {
    const hospital = HOSPITALS.find((entry) => entry.hospital_id === hospitalId) ?? null;
    if (!hospital) {
      return { ok: false, message: 'Please select a valid hospital organization.' };
    }

    if (!username.trim() || !password.trim()) {
      return { ok: false, message: 'Username and password are required.' };
    }

    const credential = findCredential(hospital.hospital_id, username, password);
    if (!credential) {
      return { ok: false, message: 'Invalid credentials for the selected hospital.' };
    }

    const session: StaffSession = {
      mode: 'authenticated',
      hospital,
      user: toStaffUser(credential),
      startedAt: new Date().toISOString(),
    };

    dispatch({ type: 'SET_SESSION', payload: session });
    persistSession(session);
    return { ok: true, message: 'Authenticated successfully.', role: session.user.role };
  };

  const enterDemoMode = (hospitalId: string): LoginResult => {
    const hospital = HOSPITALS.find((entry) => entry.hospital_id === hospitalId) ?? null;
    if (!hospital) {
      return { ok: false, message: 'Please select a valid hospital organization for demo mode.' };
    }

    const demoUser = createDemoUser(hospital.hospital_id);
    if (!demoUser) {
      return { ok: false, message: 'Unable to initialize demo mode for the selected hospital.' };
    }

    const session: StaffSession = {
      mode: 'demo',
      hospital,
      user: demoUser,
      startedAt: new Date().toISOString(),
    };

    dispatch({ type: 'SET_SESSION', payload: session });
    persistSession(session);
    return { ok: true, message: 'Demo mode started.', role: 'demo' };
  };

  const signOut = () => {
    dispatch({ type: 'SIGN_OUT' });
    persistSession(null);
  };

  const value = useMemo<AuthContextValue>(() => {
    const session = state.session;
    const role: StaffRole | null = session ? (session.mode === 'demo' ? 'demo' : session.user.role) : null;

    return {
      session,
      user: session?.user ?? null,
      hospital: session?.hospital ?? null,
      role,
      hospitals: HOSPITALS,
      isAuthenticated: session?.mode === 'authenticated',
      isDemoMode: session?.mode === 'demo',
      hasActiveSession: Boolean(session),
      loginWithCredentials,
      enterDemoMode,
      signOut,
      can: (permission) => hasPermission(session, permission),
    };
  }, [state.session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
