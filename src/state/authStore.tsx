import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import {
  HOSPITALS,
  hasPermission,
  type HospitalOption,
  type StaffPermission,
  type StaffRole,
  type StaffSession,
  type StaffUser,
} from './authSession';

interface AuthState {
  session: StaffSession | null;
  isLoading: boolean;
}

type AuthAction =
  | { type: 'SET_SESSION'; payload: StaffSession | null }
  | { type: 'SET_LOADING'; payload: boolean };

interface LoginResult {
  ok: boolean;
  message: string;
  role?: StaffRole;
}

interface AuthContextValue {
  session: StaffSession | null;
  user: StaffUser | null;
  hospital: HospitalOption | null;
  role: StaffRole | null;
  hospitals: HospitalOption[];
  isAuthenticated: boolean;
  isDemoMode: boolean;
  hasActiveSession: boolean;
  isLoading: boolean;
  loginWithCredentials: (hospitalId: string, username: string, password: string) => Promise<LoginResult>;
  enterDemoMode: (hospitalId: string) => Promise<LoginResult>;
  signOut: () => Promise<void>;
  can: (permission: StaffPermission) => boolean;
}

function reducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_SESSION':
      return { ...state, session: action.payload, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { session: null, isLoading: true });

  // Restore session from backend on mount
  useEffect(() => {
    let isMounted = true;
    fetch('/api/auth/session', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data && data.authenticated && data.session) {
          dispatch({ type: 'SET_SESSION', payload: data.session });
        } else {
          dispatch({ type: 'SET_SESSION', payload: null });
        }
      })
      .catch(() => {
        if (!isMounted) return;
        dispatch({ type: 'SET_SESSION', payload: null });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const loginWithCredentials = async (hospitalId: string, username: string, password: string): Promise<LoginResult> => {
    if (!hospitalId || !username.trim() || !password.trim()) {
      return { ok: false, message: 'Hospital, username, and password are required.' };
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospitalId, username, password }),
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        return { ok: false, message: data.message || 'Authentication failed.' };
      }

      const hospital = HOSPITALS.find((h) => h.hospital_id === hospitalId) || { hospital_id: hospitalId, name: hospitalId };
      const session: StaffSession = {
        mode: 'authenticated',
        hospital,
        user: data.user,
        startedAt: new Date().toISOString(),
      };

      dispatch({ type: 'SET_SESSION', payload: session });
      return { ok: true, message: 'Authenticated successfully.', role: data.user.role };
    } catch (err) {
      return { ok: false, message: 'Network error during sign-in.' };
    }
  };

  const enterDemoMode = async (hospitalId: string): Promise<LoginResult> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospitalId, demoMode: true }),
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        return { ok: false, message: data.message || 'Failed to start demo mode.' };
      }

      const hospital = HOSPITALS.find((h) => h.hospital_id === hospitalId) || { hospital_id: hospitalId, name: hospitalId };
      const session: StaffSession = {
        mode: 'demo',
        hospital,
        user: data.user,
        startedAt: new Date().toISOString(),
      };

      dispatch({ type: 'SET_SESSION', payload: session });
      return { ok: true, message: 'Demo mode started.', role: 'demo' };
    } catch (err) {
      return { ok: false, message: 'Network error during demo initialization.' };
    }
  };

  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      // ignore
    }
    dispatch({ type: 'SET_SESSION', payload: null });
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
      isLoading: state.isLoading,
      loginWithCredentials,
      enterDemoMode,
      signOut,
      can: (permission) => hasPermission(session, permission),
    };
  }, [state.session, state.isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
