import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
import type { AiDraftOutput } from '../types/domain';

const INTAKE_OUTPUTS_KEY = 'pharmaco.intake.outputs';
const MAX_OUTPUT_HISTORY = 30;

interface IntakeState {
  outputs: AiDraftOutput[];
}

type IntakeAction =
  | { type: 'SAVE_OUTPUT'; payload: AiDraftOutput }
  | { type: 'CLEAR_OUTPUTS' };

interface IntakeContextValue {
  outputs: AiDraftOutput[];
  latestOutput: AiDraftOutput | null;
  saveOutput: (output: AiDraftOutput) => void;
  clearOutputs: () => void;
  getOutputByPatient: (patientId: string) => AiDraftOutput | null;
}

function readStoredOutputs(): AiDraftOutput[] {
  try {
    const raw = window.localStorage.getItem(INTAKE_OUTPUTS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as AiDraftOutput[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry) => Boolean(entry?.patient_id && entry?.timestamp));
  } catch {
    return [];
  }
}

function persistOutputs(outputs: AiDraftOutput[]) {
  window.localStorage.setItem(INTAKE_OUTPUTS_KEY, JSON.stringify(outputs));
}

function reducer(state: IntakeState, action: IntakeAction): IntakeState {
  switch (action.type) {
    case 'SAVE_OUTPUT': {
      const deduped = state.outputs.filter((entry) => entry.patient_id !== action.payload.patient_id);
      const outputs = [action.payload, ...deduped].slice(0, MAX_OUTPUT_HISTORY);
      persistOutputs(outputs);
      return { outputs };
    }
    case 'CLEAR_OUTPUTS':
      persistOutputs([]);
      return { outputs: [] };
    default:
      return state;
  }
}

const IntakeContext = createContext<IntakeContextValue | undefined>(undefined);

export function IntakeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { outputs: readStoredOutputs() });

  const saveOutput = (output: AiDraftOutput) => {
    dispatch({ type: 'SAVE_OUTPUT', payload: output });
  };

  const clearOutputs = () => {
    dispatch({ type: 'CLEAR_OUTPUTS' });
  };

  const getOutputByPatient = (patientId: string) => {
    const normalized = patientId.trim().toLowerCase();
    return state.outputs.find((entry) => entry.patient_id.trim().toLowerCase() === normalized) ?? null;
  };

  const value = useMemo<IntakeContextValue>(
    () => ({
      outputs: state.outputs,
      latestOutput: state.outputs[0] ?? null,
      saveOutput,
      clearOutputs,
      getOutputByPatient,
    }),
    [state.outputs],
  );

  return <IntakeContext.Provider value={value}>{children}</IntakeContext.Provider>;
}

export function useIntake() {
  const context = useContext(IntakeContext);
  if (!context) {
    throw new Error('useIntake must be used within IntakeProvider');
  }

  return context;
}
