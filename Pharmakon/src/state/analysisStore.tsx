import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
import { runDeterministicAnalysis } from '../services/analysisService';
import type { AnalysisResponse } from '../types/domain';

interface AnalysisState {
  selectedFile: File | null;
  fileValid: boolean;
  parsingStatus: 'Not Started' | 'Parsing' | 'Complete' | 'Invalid';
  selectedDrugs: string[];
  patientId: string;
  isRunning: boolean;
  response: AnalysisResponse | null;
  error: string | null;
}

type AnalysisAction =
  | { type: 'SET_FILE'; payload: { file: File | null; valid: boolean } }
  | { type: 'SET_PARSING_STATUS'; payload: AnalysisState['parsingStatus'] }
  | { type: 'TOGGLE_DRUG'; payload: string }
  | { type: 'SET_PATIENT_ID'; payload: string }
  | { type: 'RUN_START' }
  | { type: 'RUN_SUCCESS'; payload: AnalysisResponse }
  | { type: 'RUN_ERROR'; payload: string };

const initialState: AnalysisState = {
  selectedFile: null,
  fileValid: false,
  parsingStatus: 'Not Started',
  selectedDrugs: [],
  patientId: 'PT-2041',
  isRunning: false,
  response: null,
  error: null,
};

function reducer(state: AnalysisState, action: AnalysisAction): AnalysisState {
  switch (action.type) {
    case 'SET_FILE':
      return {
        ...state,
        selectedFile: action.payload.file,
        fileValid: action.payload.valid,
        parsingStatus: action.payload.valid ? 'Parsing' : 'Invalid',
      };
    case 'SET_PARSING_STATUS':
      return {
        ...state,
        parsingStatus: action.payload,
      };
    case 'TOGGLE_DRUG': {
      const exists = state.selectedDrugs.includes(action.payload);
      return {
        ...state,
        selectedDrugs: exists
          ? state.selectedDrugs.filter((drug) => drug !== action.payload)
          : [...state.selectedDrugs, action.payload],
      };
    }
    case 'SET_PATIENT_ID':
      return {
        ...state,
        patientId: action.payload,
      };
    case 'RUN_START':
      return {
        ...state,
        isRunning: true,
        error: null,
      };
    case 'RUN_SUCCESS':
      return {
        ...state,
        isRunning: false,
        response: action.payload,
        error: null,
      };
    case 'RUN_ERROR':
      return {
        ...state,
        isRunning: false,
        error: action.payload,
      };
    default:
      return state;
  }
}

interface AnalysisContextValue {
  state: AnalysisState;
  canRun: boolean;
  setFile: (file: File | null) => void;
  toggleDrug: (drug: string) => void;
  setPatientId: (id: string) => void;
  runAnalysis: () => Promise<void>;
}

const AnalysisContext = createContext<AnalysisContextValue | undefined>(undefined);

function validateFile(file: File | null): boolean {
  if (!file) {
    return false;
  }

  const lowerName = file.name.toLowerCase();
  return lowerName.endsWith('.vcf');
}

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setFile = (file: File | null) => {
    const valid = validateFile(file);
    dispatch({ type: 'SET_FILE', payload: { file, valid } });

    if (valid) {
      window.setTimeout(() => {
        dispatch({ type: 'SET_PARSING_STATUS', payload: 'Complete' });
      }, 350);
    }
  };

  const toggleDrug = (drug: string) => {
    dispatch({ type: 'TOGGLE_DRUG', payload: drug });
  };

  const setPatientId = (id: string) => {
    dispatch({ type: 'SET_PATIENT_ID', payload: id });
  };

  const runAnalysis = async () => {
    dispatch({ type: 'RUN_START' });

    try {
      const response = await runDeterministicAnalysis(state.patientId, state.selectedDrugs);
      dispatch({ type: 'RUN_SUCCESS', payload: response });
    } catch (error) {
      dispatch({
        type: 'RUN_ERROR',
        payload: error instanceof Error ? error.message : 'Analysis failed unexpectedly.',
      });
    }
  };

  const value = useMemo<AnalysisContextValue>(
    () => ({
      state,
      canRun: state.fileValid && state.parsingStatus === 'Complete' && state.selectedDrugs.length > 0 && !state.isRunning,
      setFile,
      toggleDrug,
      setPatientId,
      runAnalysis,
    }),
    [state],
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within AnalysisProvider');
  }

  return context;
}
