import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/authStore';

interface ErpNavigationProps {
  activeTab?: string;
  patientId?: string;
}

export function ErpNavigation({ activeTab, patientId }: ErpNavigationProps) {
  const { user, signOut, role, hospital, isDemoMode, can } = useAuth();
  const navigate = useNavigate();

  const roleLabels: Record<string, string> = {
    admin: 'Hospital Administrator',
    doctor: 'Attending Physician',
    nurse: 'Clinical Nurse RN',
    lab_technician: 'Diagnostic Lab Specialist',
    demo: 'Product Tour Mode',
  };

  const roleColors: Record<string, string> = {
    admin: '#8b5cf6',
    doctor: '#22c7ff',
    nurse: '#10b981',
    lab_technician: '#f59e0b',
    demo: '#ec4899',
  };

  const roleKey = role || 'doctor';
  const roleColor = roleColors[roleKey] || '#22c7ff';
  const roleLabel = roleLabels[roleKey] || roleKey;

  const canUploadVcf = can('upload:vcf');

  return (
    <header className="erp-header-shell">
      <div className="erp-header-top">
        <div className="erp-brand-cluster" onClick={() => navigate('/registry')} style={{ cursor: 'pointer' }}>
          <img src="/PharmaKon.png" alt="PharmaKon Logo" style={{ height: '42px', objectFit: 'contain' }} />
          <div>
            <div className="erp-brand-title">
              <span className="erp-version-badge">ERP v2.4</span>
            </div>
            <p className="erp-brand-subtitle">
              {hospital?.name || 'Metropolitan Medical Center'} · Enterprise Clinical System
            </p>
          </div>
        </div>

        <div className="erp-header-center">
          <div className="erp-storage-badge">
            <span>Per-Patient Folder ID Engine: <strong>Active</strong></span>
            <span className="erp-sync-dot" title="Real-time multi-role sync enabled" />
          </div>
          {patientId && (
            <div className="erp-active-patient-tag">
              <span>Active Patient:</span>
              <strong>{patientId}</strong>
            </div>
          )}
        </div>

        <div className="erp-header-right">
          <div className="erp-user-profile-badge">
            <div
              className="erp-avatar"
              style={{ backgroundColor: roleColor }}
            >
              {user?.display_name ? user.display_name.slice(0, 2).toUpperCase() : 'ST'}
            </div>
            <div className="erp-user-meta">
              <strong>{user?.display_name || 'Staff User'}</strong>
              <span style={{ color: roleColor }}>
                {roleLabel}
              </span>
            </div>
          </div>

          {canUploadVcf && (
            <NavLink to="/upload" className="erp-quick-action-btn erp-intake-btn">
              + VCF Intake
            </NavLink>
          )}

          <button type="button" className="erp-quick-action-btn erp-logout-btn" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>

      {isDemoMode && (
        <div className="erp-demo-banner">
          <span><strong>Product Demo Mode Active</strong> — Non-clinical simulated environment. Real-time folder syncing and cross-role updates active.</span>
        </div>
      )}

      <nav className="erp-nav-bar" aria-label="ERP Modules">
        <NavLink
          to="/registry"
          className={({ isActive }) => `erp-nav-link ${isActive || activeTab === 'registry' ? 'active' : ''}`}
        >
          <span>Patient Registry & Folders</span>
        </NavLink>

        <NavLink
          to={patientId ? `/dashboard?patientId=${encodeURIComponent(patientId)}` : '/dashboard'}
          className={({ isActive }) => `erp-nav-link ${isActive || activeTab === 'dashboard' ? 'active' : ''}`}
        >
          <span>Clinical Decision Console</span>
        </NavLink>

        <NavLink
          to="/appointments"
          className={({ isActive }) => `erp-nav-link ${isActive || activeTab === 'appointments' ? 'active' : ''}`}
        >
          <span>Appointments</span>
        </NavLink>

        <NavLink
          to="/billing"
          className={({ isActive }) => `erp-nav-link ${isActive || activeTab === 'billing' ? 'active' : ''}`}
        >
          <span>Invoicing & Billing</span>
        </NavLink>

        <NavLink
          to="/pharmacy"
          className={({ isActive }) => `erp-nav-link ${isActive || activeTab === 'pharmacy' ? 'active' : ''}`}
        >
          <span>Pharmacy & Drug Inventory</span>
        </NavLink>

        <NavLink
          to="/wards"
          className={({ isActive }) => `erp-nav-link ${isActive || activeTab === 'wards' ? 'active' : ''}`}
        >
          <span>Wards & Bed Allocation</span>
        </NavLink>

        <NavLink
          to="/longitudinal/LP-88421"
          className={({ isActive }) => `erp-nav-link ${isActive || activeTab === 'longitudinal' ? 'active' : ''}`}
        >
          <span>Cross-Hospital Identity</span>
        </NavLink>

        <NavLink
          to="/transparency"
          className={({ isActive }) => `erp-nav-link ${isActive || activeTab === 'transparency' ? 'active' : ''}`}
        >
          <span>Audit & Transparency</span>
        </NavLink>
      </nav>
    </header>
  );
}
