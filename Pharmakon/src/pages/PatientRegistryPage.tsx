import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ErpNavigation } from '../components/ErpNavigation';
import {
  fetchErpStats,
  fetchPatientFolderFiles,
  fetchPatientRegistry,
  registerNewPatient,
} from '../services/erpService';
import { useAuth } from '../state/authStore';
import type { ErpStats, PatientFolderDetailsResponse, PatientRegistryItem } from '../types/domain';

export function PatientRegistryPage() {
  const { user, hospital } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<ErpStats | null>(null);
  const [patients, setPatients] = useState<PatientRegistryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Register Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [regForm, setRegForm] = useState({
    fullName: '',
    dateOfBirth: '',
    age: '',
    gender: 'Male',
    phoneNumber: '',
    email: '',
    department: 'General Medicine',
    assignedDoctor: user?.display_name || 'Dr. Emily Vance',
    admissionType: 'In-Patient',
    emergencyContactName: '',
    emergencyContactPhone: '',
    initialDiagnosis: '',
  });

  // Folder Inspector Modal State
  const [inspectPatientId, setInspectPatientId] = useState<string | null>(null);
  const [folderDetails, setFolderDetails] = useState<PatientFolderDetailsResponse | null>(null);
  const [loadingFolder, setLoadingFolder] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, patientList] = await Promise.all([
        fetchErpStats().catch(() => null),
        fetchPatientRegistry(),
      ]);
      setStats(statsData);
      setPatients(patientList);
    } catch (err) {
      console.error('Failed to load ERP registry data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInspectFolder = async (patientId: string) => {
    setInspectPatientId(patientId);
    setLoadingFolder(true);
    setSelectedFileName(null);
    try {
      const details = await fetchPatientFolderFiles(patientId);
      setFolderDetails(details);
      if (details.files.length > 0) {
        setSelectedFileName(details.files[0].name);
      }
    } catch (err) {
      console.error('Failed to inspect patient folder:', err);
    } finally {
      setLoadingFolder(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.fullName.trim()) {
      setRegisterError('Full name is required.');
      return;
    }

    setRegistering(true);
    setRegisterError(null);

    try {
      await registerNewPatient(regForm);
      setShowRegisterModal(false);
      setRegForm({
        fullName: '',
        dateOfBirth: '',
        age: '',
        gender: 'Male',
        phoneNumber: '',
        email: '',
        department: 'General Medicine',
        assignedDoctor: user?.display_name || 'Dr. Emily Vance',
        admissionType: 'In-Patient',
        emergencyContactName: '',
        emergencyContactPhone: '',
        initialDiagnosis: '',
      });
      await loadData();
    } catch (err: unknown) {
      setRegisterError((err as Error)?.message || 'Registration failed.');
    } finally {
      setRegistering(false);
    }
  };

  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      searchQuery === '' ||
      p.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.assignedDoctor.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = departmentFilter === 'ALL' || p.department === departmentFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'admitted' && p.status === 'admitted') ||
      (statusFilter === 'outpatient' && p.status !== 'admitted');

    return matchesSearch && matchesDept && matchesStatus;
  });

  const selectedFileData = folderDetails?.files.find((f) => f.name === selectedFileName)?.data;

  return (
    <div className="erp-page-container">
      <ErpNavigation activeTab="registry" />

      <main className="erp-main-body">
        <div className="erp-page-header">
          <div className="erp-title-area">
            <h1>Patient Master Index & Folder Store</h1>
            <p>
              Autonomous per-patient folder storage engine · Hospital: {hospital?.name || 'Metropolitan Medical Center'}
            </p>
          </div>

          <div className="erp-header-actions">
            <button
              type="button"
              className="erp-btn-primary"
              onClick={() => setShowRegisterModal(true)}
            >
              + Register New Patient
            </button>
            <button
              type="button"
              className="erp-btn-secondary"
              onClick={loadData}
              title="Refresh Registry"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* ERP STATS KPI TILES */}
        <section className="erp-stats-grid">
          <div className="erp-stat-card" style={{ '--card-accent': '#22c7ff' } as React.CSSProperties}>
            <span className="erp-stat-label">Total Registered</span>
            <div className="erp-stat-value">{stats?.totalPatients ?? patients.length}</div>
            <span className="erp-stat-meta">Active patient records in disk folders</span>
          </div>

          <div className="erp-stat-card" style={{ '--card-accent': '#10b981' } as React.CSSProperties}>
            <span className="erp-stat-label">Admitted In-Patients</span>
            <div className="erp-stat-value">{stats?.admittedInPatients ?? 0}</div>
            <span className="erp-stat-meta">Assigned to hospital inpatient wards</span>
          </div>

          <div className="erp-stat-card" style={{ '--card-accent': '#8b5cf6' } as React.CSSProperties}>
            <span className="erp-stat-label">Bed Occupancy Rate</span>
            <div className="erp-stat-value">{stats?.bedOccupancyRate ?? 0}%</div>
            <span className="erp-stat-meta">
              {stats?.occupiedBeds ?? 0} / {stats?.totalBeds ?? 0} total beds occupied
            </span>
          </div>

          <div className="erp-stat-card" style={{ '--card-accent': '#ef4444' } as React.CSSProperties}>
            <span className="erp-stat-label">Genomic Risk Alerts</span>
            <div className="erp-stat-value">{stats?.criticalGenomicRisks ?? 0}</div>
            <span className="erp-stat-meta">Critical / High drug-gene interactions</span>
          </div>
        </section>

        {/* PATIENT SEARCH & REGISTRY TABLE */}
        <section className="erp-panel-card">
          <div className="erp-panel-header">
            <h3>All Patients Directory ({filteredPatients.length})</h3>

            <div className="erp-search-filter-bar">
              <input
                type="text"
                placeholder="Search patient name, ID, or doctor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="erp-search-input"
              />

              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="erp-select-filter"
              >
                <option value="ALL">All Departments</option>
                <option value="General Medicine">General Medicine</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Neurology">Neurology</option>
                <option value="Oncology">Oncology</option>
                <option value="Critical Care (ICU)">Critical Care (ICU)</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="erp-select-filter"
              >
                <option value="ALL">All Statuses</option>
                <option value="admitted">Admitted (IPD)</option>
                <option value="outpatient">Outpatient (OPD)</option>
              </select>
            </div>
          </div>

          <div className="erp-table-responsive">
            <table className="erp-data-table">
              <thead>
                <tr>
                  <th>Patient ID & Folder</th>
                  <th>Patient Name</th>
                  <th>Age / Sex</th>
                  <th>Department</th>
                  <th>Attending Doctor</th>
                  <th>Admission</th>
                  <th>PGx Risk</th>
                  <th>Last Modified</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      Loading patient records from storage engine...
                    </td>
                  </tr>
                ) : filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No patient records found matching query.
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => {
                    const severityClass =
                      patient.severity === 'critical'
                        ? 'erp-badge-critical'
                        : patient.severity === 'high'
                          ? 'erp-badge-high'
                          : 'erp-badge-low';

                    const isAdmitted = patient.status === 'admitted';

                    return (
                      <tr key={patient.patientId}>
                        <td>
                          <div className="erp-patient-id-cell">
                            <strong>{patient.patientId}</strong>
                            <button
                              type="button"
                              className="erp-folder-icon-btn"
                              onClick={() => handleInspectFolder(patient.patientId)}
                              title="Inspect Individual Folder on Disk"
                            >
                              Folder
                            </button>
                          </div>
                        </td>
                        <td>
                          <strong>{patient.patientName}</strong>
                        </td>
                        <td>
                          {patient.age} / {patient.gender}
                        </td>
                        <td>{patient.department}</td>
                        <td>{patient.assignedDoctor}</td>
                        <td>
                          <span className={`erp-badge ${isAdmitted ? 'erp-badge-admitted' : 'erp-badge-discharged'}`}>
                            {isAdmitted ? 'Admitted (IPD)' : 'Outpatient (OPD)'}
                          </span>
                        </td>
                        <td>
                          <span className={`erp-badge ${severityClass}`}>
                            {patient.riskLabel || 'Standard'}
                          </span>
                        </td>
                        <td>
                          <small style={{ color: 'var(--text-muted)' }}>
                            {new Date(patient.updatedAt).toLocaleDateString()} · {new Date(patient.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </small>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <Link
                              to={`/dashboard?patientId=${encodeURIComponent(patient.patientId)}`}
                              className="erp-action-btn-sm"
                            >
                              Console
                            </Link>
                            <button
                              type="button"
                              className="erp-action-btn-sm"
                              onClick={() => navigate(`/appointments?patientId=${encodeURIComponent(patient.patientId)}`)}
                            >
                              Apt
                            </button>
                            <button
                              type="button"
                              className="erp-action-btn-sm"
                              onClick={() => navigate(`/billing?patientId=${encodeURIComponent(patient.patientId)}`)}
                            >
                              Bill
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* MODAL: REGISTER NEW PATIENT */}
      {showRegisterModal && (
        <div className="erp-modal-overlay">
          <div className="erp-modal-box" style={{ maxWidth: '680px' }}>
            <div className="erp-modal-header">
              <h2>New Patient Registration & Folder Creation</h2>
              <button
                type="button"
                className="erp-modal-close-btn"
                onClick={() => setShowRegisterModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit}>
              <div className="erp-modal-body">
                {registerError && (
                  <div style={{ background: 'var(--toxic-light)', color: 'var(--toxic)', border: '1px solid #fecaca', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    {registerError}
                  </div>
                )}

                <div className="erp-form-grid">
                  <div className="erp-form-group">
                    <label>Full Patient Name *</label>
                    <input
                      type="text"
                      className="erp-input"
                      placeholder="e.g. Eleanor Vance"
                      value={regForm.fullName}
                      onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="erp-form-group">
                    <label>Date of Birth</label>
                    <input
                      type="date"
                      className="erp-input"
                      value={regForm.dateOfBirth}
                      onChange={(e) => setRegForm({ ...regForm, dateOfBirth: e.target.value })}
                    />
                  </div>

                  <div className="erp-form-group">
                    <label>Age</label>
                    <input
                      type="text"
                      className="erp-input"
                      placeholder="e.g. 52"
                      value={regForm.age}
                      onChange={(e) => setRegForm({ ...regForm, age: e.target.value })}
                    />
                  </div>

                  <div className="erp-form-group">
                    <label>Gender</label>
                    <select
                      className="erp-input"
                      value={regForm.gender}
                      onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Unspecified">Unspecified</option>
                    </select>
                  </div>

                  <div className="erp-form-group">
                    <label>Phone Number</label>
                    <input
                      type="text"
                      className="erp-input"
                      placeholder="+1 (555) 019-2834"
                      value={regForm.phoneNumber}
                      onChange={(e) => setRegForm({ ...regForm, phoneNumber: e.target.value })}
                    />
                  </div>

                  <div className="erp-form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      className="erp-input"
                      placeholder="patient@email.com"
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    />
                  </div>

                  <div className="erp-form-group">
                    <label>Department</label>
                    <select
                      className="erp-input"
                      value={regForm.department}
                      onChange={(e) => setRegForm({ ...regForm, department: e.target.value })}
                    >
                      <option value="General Medicine">General Medicine</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Neurology">Neurology</option>
                      <option value="Oncology">Oncology</option>
                      <option value="Critical Care (ICU)">Critical Care (ICU)</option>
                    </select>
                  </div>

                  <div className="erp-form-group">
                    <label>Attending Doctor</label>
                    <input
                      type="text"
                      className="erp-input"
                      placeholder="e.g. Dr. Arthur Miller"
                      value={regForm.assignedDoctor}
                      onChange={(e) => setRegForm({ ...regForm, assignedDoctor: e.target.value })}
                    />
                  </div>

                  <div className="erp-form-group">
                    <label>Admission Type</label>
                    <select
                      className="erp-input"
                      value={regForm.admissionType}
                      onChange={(e) => setRegForm({ ...regForm, admissionType: e.target.value })}
                    >
                      <option value="In-Patient">In-Patient (IPD)</option>
                      <option value="Out-Patient">Out-Patient (OPD)</option>
                      <option value="Emergency">Emergency</option>
                    </select>
                  </div>

                  <div className="erp-form-group">
                    <label>Emergency Contact</label>
                    <input
                      type="text"
                      className="erp-input"
                      placeholder="Contact Name & Phone"
                      value={regForm.emergencyContactName}
                      onChange={(e) => setRegForm({ ...regForm, emergencyContactName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="erp-form-group" style={{ marginTop: '0.5rem' }}>
                  <label>Initial Clinical Diagnosis / Chief Complaint</label>
                  <textarea
                    className="erp-input"
                    rows={3}
                    placeholder="Chief complaint, admission remarks, and initial evaluation notes..."
                    value={regForm.initialDiagnosis}
                    onChange={(e) => setRegForm({ ...regForm, initialDiagnosis: e.target.value })}
                  />
                </div>
              </div>

              <div className="erp-modal-header" style={{ justifyContent: 'flex-end', gap: '0.75rem', background: 'transparent' }}>
                <button
                  type="button"
                  className="erp-btn-secondary"
                  onClick={() => setShowRegisterModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="erp-btn-primary"
                  disabled={registering}
                >
                  {registering ? 'Creating Folder on Disk...' : 'Create Patient Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DISK FOLDER INSPECTOR */}
      {inspectPatientId && (
        <div className="erp-modal-overlay">
          <div className="erp-modal-box">
            <div className="erp-modal-header">
              <h2>Individual Patient Folder Inspector: {inspectPatientId}</h2>
              <button
                type="button"
                className="erp-modal-close-btn"
                onClick={() => setInspectPatientId(null)}
              >
                ×
              </button>
            </div>

            <div className="erp-modal-body">
              {loadingFolder ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  Reading patient folder structure from server disk...
                </div>
              ) : (
                <div className="erp-folder-tree-layout">
                  <div className="erp-folder-file-list">
                    <div className="erp-folder-path-header">
                      {folderDetails?.folderPath || `storage/patients/H1/${inspectPatientId}`}
                    </div>

                    <small style={{ color: '#94a3b8', margin: '0.2rem 0.4rem', fontWeight: 600 }}>
                      DOCUMENTS ({folderDetails?.files?.length || 0})
                    </small>

                    {folderDetails?.files?.map((file) => (
                      <button
                        type="button"
                        key={file.name}
                        className={`erp-file-item-btn ${file.name === selectedFileName ? 'active' : ''}`}
                        onClick={() => setSelectedFileName(file.name)}
                      >
                        <div className="erp-file-item-name">
                          <span>{file.name}</span>
                        </div>
                        <span className="erp-file-item-size">
                          {(file.sizeBytes / 1024).toFixed(1)} KB
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="erp-file-content-viewer">
                    <div className="erp-file-content-header">
                      <h4>
                        {selectedFileName ? `Viewing: ${selectedFileName}` : 'Select a document to inspect'}
                      </h4>
                      {selectedFileName && (
                        <span style={{ fontSize: '0.74rem', color: '#6ee7b7' }}>
                          JSON Data · Live Disk Mirror
                        </span>
                      )}
                    </div>

                    <pre className="erp-json-pre">
                      {selectedFileData
                        ? JSON.stringify(selectedFileData, null, 2)
                        : '// Select a JSON document from the left folder tree to inspect its contents.'}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            <div className="erp-modal-header" style={{ justifyContent: 'space-between', background: 'transparent' }}>
              <div style={{ fontSize: '0.8rem', color: '#8da2bc' }}>
                All folder changes synchronize atomically across all roles.
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Link
                  to={`/dashboard?patientId=${encodeURIComponent(inspectPatientId)}`}
                  className="erp-btn-primary"
                  style={{ textDecoration: 'none' }}
                >
                  Open in Clinical Console
                </Link>
                <button
                  type="button"
                  className="erp-btn-secondary"
                  onClick={() => setInspectPatientId(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
