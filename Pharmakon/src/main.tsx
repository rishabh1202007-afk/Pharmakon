import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AnalysisProvider } from './state/analysisStore';
import { AuthProvider } from './state/authStore';
import { IntakeProvider } from './state/intakeStore';
import './styles.css';
import './erp-styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <IntakeProvider>
        <BrowserRouter>
          <AnalysisProvider>
            <App />
          </AnalysisProvider>
        </BrowserRouter>
      </IntakeProvider>
    </AuthProvider>
  </React.StrictMode>,
);
