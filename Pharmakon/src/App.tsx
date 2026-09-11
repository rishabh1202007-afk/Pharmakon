import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { LongitudinalPatientPage } from './pages/LongitudinalPatientPage';
import { TransparencyPage } from './pages/TransparencyPage';
import { HospitalSignsPage } from './pages/HospitalSignsPage';
import { ArchitecturePage } from './pages/ArchitecturePage';
import { VcfIntakePage } from './pages/VcfIntakePage';
import { TermsConditionsPage } from './pages/TermsConditionsPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { DataProtectionPolicyPage } from './pages/DataProtectionPolicyPage';
import { AboutPage } from './pages/AboutPage';
import { PatientRegistryPage } from './pages/PatientRegistryPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { BillingPage } from './pages/BillingPage';
import { PharmacyInventoryPage } from './pages/PharmacyInventoryPage';
import { WardsManagementPage } from './pages/WardsManagementPage';
import { useAuth } from './state/authStore';
import type { StaffPermission } from './state/authSession';

function LaunchRoute() {
  const { hasActiveSession, isDemoMode, role } = useAuth();

  if (!hasActiveSession) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'admin') {
    return <Navigate to="/registry" replace />;
  }

  return <Navigate to={isDemoMode ? '/landing' : '/registry'} replace />;
}

function LandingRoute() {
  return <LandingPage />;
}

function ProtectedRoute({ children, requiredPermission }: { children: JSX.Element; requiredPermission?: StaffPermission }) {
  const { hasActiveSession, can } = useAuth();

  if (!hasActiveSession) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && !can(requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LaunchRoute />} />
      <Route path="/landing" element={<LandingRoute />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Hospital ERP Module Routes */}
      <Route
        path="/registry"
        element={
          <ProtectedRoute>
            <PatientRegistryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments"
        element={
          <ProtectedRoute>
            <AppointmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <BillingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pharmacy"
        element={
          <ProtectedRoute>
            <PharmacyInventoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/wards"
        element={
          <ProtectedRoute>
            <WardsManagementPage />
          </ProtectedRoute>
        }
      />

      {/* Clinical Console & Genomic Intake */}
      <Route
        path="/upload"
        element={
          <ProtectedRoute requiredPermission="upload:vcf">
            <VcfIntakePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/longitudinal/:longitudinalId"
        element={
          <ProtectedRoute>
            <LongitudinalPatientPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transparency"
        element={
          <ProtectedRoute>
            <TransparencyPage />
          </ProtectedRoute>
        }
      />

      {/* Informational Pages */}
      <Route path="/hospital-signs" element={<HospitalSignsPage />} />
      <Route path="/architecture" element={<ArchitecturePage />} />
      <Route path="/terms" element={<TermsConditionsPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/data-protection" element={<DataProtectionPolicyPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
