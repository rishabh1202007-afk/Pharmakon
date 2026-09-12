import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ErpNavigation } from '../components/ErpNavigation';
import {
  createAppointment,
  fetchAppointments,
  fetchPatientRegistry,
  updateAppointment,
} from '../services/erpService';
import { useAuth } from '../state/authStore';
import type { AppointmentRecord, PatientRegistryItem } from '../types/domain';

export function AppointmentsPage() {
  const { user, hospital } = useAuth();
  const [searchParams] = useSearchParams();
  const initialPatientId = searchParams.get('patientId') || '';

  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [patients, setPatients] = useState<PatientRegistryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState(initialPatientId);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [doctorFilter, setDoctorFilter] = useState('ALL');

  // Book Appointment Modal State
  const [showBookModal, setShowBookModal] = useState(false);
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const [bookForm, setBookForm] = useState({
    patientId: initialPatientId || '',
    patientName: '',
    doctorName: user?.display_name || 'Dr. Arthur Miller',
    department: 'General Medicine',
    date: new Date().toISOString().slice(0, 10),
    time: '10:30',
    type: 'Consultation',
    reason: 'Follow-up on pharmacogenomic dosage adjustment',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [aptList, patientList] = await Promise.all([
        fetchAppointments(),
        fetchPatientRegistry(),
      ]);
      setAppointments(aptList);
      setPatients(patientList);
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePatientSelect = (pid: string) => {
    const selected = patients.find((p) => p.patientId === pid);
    setBookForm((prev) => ({
      ...prev,
      patientId: pid,
      patientName: selected ? selected.patientName : pid,
      department: selected?.department || prev.department,
      doctorName: selected?.assignedDoctor || prev.doctorName,
    }));
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookForm.patientId.trim() || !bookForm.doctorName.trim() || !bookForm.date || !bookForm.time) {
      setBookError('Please fill out all required appointment fields.');
      return;
    }

    setBooking(true);
    setBookError(null);

    try {
      await createAppointment(bookForm);
      setShowBookModal(false);
      await loadData();
    } catch (err: unknown) {
      setBookError((err as Error)?.message || 'Failed to schedule appointment.');
    } finally {
      setBooking(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: AppointmentRecord['status']) => {
    try {
      await updateAppointment(id, { status: newStatus });
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
      );
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch =
      searchFilter === '' ||
      apt.patientId.toLowerCase().includes(searchFilter.toLowerCase()) ||
      apt.patientName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      apt.reason.toLowerCase().includes(searchFilter.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || apt.status === statusFilter;
    const matchesDoctor = doctorFilter === 'ALL' || apt.doctorName === doctorFilter;

    return matchesSearch && matchesStatus && matchesDoctor;
  });

  const uniqueDoctors = Array.from(new Set(appointments.map((a) => a.doctorName).filter(Boolean)));

  return (
    <div className="erp-page-container">
      <ErpNavigation activeTab="appointments" />

      <main className="erp-main-body">
        <div className="erp-page-header">
          <div className="erp-title-area">
            <h1>Clinical Appointments & Consultations</h1>
            <p>
              Hospital appointment scheduling synchronized with individual patient folders · {hospital?.name || 'Hospital'}
            </p>
          </div>

          <div className="erp-header-actions">
            <button
              type="button"
              className="erp-btn-primary"
              onClick={() => setShowBookModal(true)}
            >
              + Schedule Appointment
            </button>
            <button
              type="button"
              className="erp-btn-secondary"
              onClick={loadData}
            >
              Refresh
            </button>
          </div>
        </div>

        {/* APPOINTMENT STATS */}
        <section className="erp-stats-grid">
          <div className="erp-stat-card" style={{ '--card-accent': '#22c7ff' } as React.CSSProperties}>
            <span className="erp-stat-label">Total Appointments</span>
            <div className="erp-stat-value">{appointments.length}</div>
            <span className="erp-stat-meta">Scheduled & completed sessions</span>
          </div>

          <div className="erp-stat-card" style={{ '--card-accent': '#10b981' } as React.CSSProperties}>
            <span className="erp-stat-label">Upcoming / Scheduled</span>
            <div className="erp-stat-value">
              {appointments.filter((a) => a.status === 'Scheduled').length}
            </div>
            <span className="erp-stat-meta">Ready for clinical consultation</span>
          </div>

          <div className="erp-stat-card" style={{ '--card-accent': '#f59e0b' } as React.CSSProperties}>
            <span className="erp-stat-label">In-Progress Today</span>
            <div className="erp-stat-value">
              {appointments.filter((a) => a.status === 'In-Progress').length}
            </div>
            <span className="erp-stat-meta">Currently in doctor consultation</span>
          </div>

          <div className="erp-stat-card" style={{ '--card-accent': '#8b5cf6' } as React.CSSProperties}>
            <span className="erp-stat-label">Completed</span>
            <div className="erp-stat-value">
              {appointments.filter((a) => a.status === 'Completed').length}
            </div>
            <span className="erp-stat-meta">Past consultation encounters</span>
          </div>
        </section>

        {/* APPOINTMENTS LIST PANEL */}
        <section className="erp-panel-card">
          <div className="erp-panel-header">
            <h3>Scheduled Appointments ({filteredAppointments.length})</h3>

            <div className="erp-search-filter-bar">
              <input
                type="text"
                placeholder="Filter patient ID, name, or reason..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="erp-search-input"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="erp-select-filter"
              >
                <option value="ALL">All Statuses</option>
                <option value="Scheduled">Scheduled</option>
                <option value="In-Progress">In-Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <select
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
                className="erp-select-filter"
              >
                <option value="ALL">All Attending Doctors</option>
                {uniqueDoctors.map((doc) => (
                  <option key={doc} value={doc}>
                    {doc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="erp-table-responsive">
            <table className="erp-data-table">
              <thead>
                <tr>
                  <th>Appointment ID</th>
                  <th>Patient</th>
                  <th>Attending Doctor</th>
                  <th>Department</th>
                  <th>Date & Time</th>
                  <th>Type</th>
                  <th>Clinical Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      Loading appointment calendar...
                    </td>
                  </tr>
                ) : filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No appointments matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((apt) => {
                    const statusBg =
                      apt.status === 'Scheduled'
                        ? 'var(--accent-light)'
                        : apt.status === 'In-Progress'
                          ? 'var(--adjust-light)'
                          : apt.status === 'Completed'
                            ? 'var(--safe-light)'
                            : 'var(--bg-subtle)';
                    const statusColor =
                      apt.status === 'Scheduled'
                        ? 'var(--accent-deep)'
                        : apt.status === 'In-Progress'
                          ? 'var(--adjust)'
                          : apt.status === 'Completed'
                            ? 'var(--safe)'
                            : 'var(--text-muted)';

                    return (
                      <tr key={apt.id}>
                        <td>
                          <strong>{apt.id}</strong>
                        </td>
                        <td>
                          <div>
                            <strong>{apt.patientName}</strong>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              ID: {apt.patientId}
                            </div>
                          </div>
                        </td>
                        <td>{apt.doctorName}</td>
                        <td>{apt.department}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{apt.date}</div>
                          <small style={{ color: 'var(--text-muted)' }}>{apt.time}</small>
                        </td>
                        <td>
                          <span
                            style={{
                              padding: '0.2rem 0.5rem',
                              background: 'var(--bg-subtle)',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              border: '1px solid var(--border)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {apt.type}
                          </span>
                        </td>
                        <td>{apt.reason}</td>
                        <td>
                          <span
                            className="erp-badge"
                            style={{
                              backgroundColor: statusBg,
                              borderColor: statusColor,
                              color: statusColor,
                            }}
                          >
                            {apt.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {apt.status === 'Scheduled' && (
                              <button
                                type="button"
                                className="erp-action-btn-sm"
                                onClick={() => handleStatusChange(apt.id, 'In-Progress')}
                                title="Start Consultation"
                              >
                                Start
                              </button>
                            )}

                            {apt.status === 'In-Progress' && (
                              <button
                                type="button"
                                className="erp-action-btn-sm"
                                onClick={() => handleStatusChange(apt.id, 'Completed')}
                                title="Mark Completed"
                              >
                                Complete
                              </button>
                            )}

                            <Link
                              to={`/dashboard?patientId=${encodeURIComponent(apt.patientId)}`}
                              className="erp-action-btn-sm"
                              title="Open Patient Clinical Console"
                            >
                              Console
                            </Link>
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

      {/* BOOK APPOINTMENT MODAL */}
      {showBookModal && (
        <div className="erp-modal-overlay">
          <div className="erp-modal-box" style={{ maxWidth: '640px' }}>
            <div className="erp-modal-header">
              <h2>Book Patient Consultation</h2>
              <button
                type="button"
                className="erp-modal-close-btn"
                onClick={() => setShowBookModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleBookSubmit}>
              <div className="erp-modal-body">
                {bookError && (
                  <div style={{ background: 'var(--toxic-light)', color: 'var(--toxic)', border: '1px solid #fecaca', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    {bookError}
                  </div>
                )}

                <div className="erp-form-grid">
                  <div className="erp-form-group">
                    <label>Select Patient *</label>
                    <select
                      className="erp-input"
                      value={bookForm.patientId}
                      onChange={(e) => handlePatientSelect(e.target.value)}
                      required
                    >
                      <option value="">-- Choose Existing Patient --</option>
                      {patients.map((p) => (
                        <option key={p.patientId} value={p.patientId}>
                          {p.patientName} ({p.patientId})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="erp-form-group">
                    <label>Patient ID (or Custom)</label>
                    <input
                      type="text"
                      className="erp-input"
                      value={bookForm.patientId}
                      onChange={(e) => setBookForm({ ...bookForm, patientId: e.target.value })}
                      placeholder="e.g. PTC001X31"
                      required
                    />
                  </div>

                  <div className="erp-form-group">
                    <label>Patient Full Name</label>
                    <input
                      type="text"
                      className="erp-input"
                      value={bookForm.patientName}
                      onChange={(e) => setBookForm({ ...bookForm, patientName: e.target.value })}
                      placeholder="e.g. Eleanor Vance"
                    />
                  </div>

                  <div className="erp-form-group">
                    <label>Attending Doctor *</label>
                    <input
                      type="text"
                      className="erp-input"
                      value={bookForm.doctorName}
                      onChange={(e) => setBookForm({ ...bookForm, doctorName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="erp-form-group">
                    <label>Department</label>
                    <select
                      className="erp-input"
                      value={bookForm.department}
                      onChange={(e) => setBookForm({ ...bookForm, department: e.target.value })}
                    >
                      <option value="General Medicine">General Medicine</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Neurology">Neurology</option>
                      <option value="Oncology">Oncology</option>
                      <option value="Critical Care (ICU)">Critical Care (ICU)</option>
                    </select>
                  </div>

                  <div className="erp-form-group">
                    <label>Consultation Type</label>
                    <select
                      className="erp-input"
                      value={bookForm.type}
                      onChange={(e) => setBookForm({ ...bookForm, type: e.target.value })}
                    >
                      <option value="Consultation">Routine Consultation</option>
                      <option value="Genomic Review">Genomic PGx Review</option>
                      <option value="Follow-up">Post-Medication Follow-up</option>
                      <option value="Pre-Op Check">Pre-Op Evaluation</option>
                      <option value="Emergency">Emergency Evaluation</option>
                    </select>
                  </div>

                  <div className="erp-form-group">
                    <label>Date *</label>
                    <input
                      type="date"
                      className="erp-input"
                      value={bookForm.date}
                      onChange={(e) => setBookForm({ ...bookForm, date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="erp-form-group">
                    <label>Time Slot *</label>
                    <input
                      type="time"
                      className="erp-input"
                      value={bookForm.time}
                      onChange={(e) => setBookForm({ ...bookForm, time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="erp-form-group">
                  <label>Reason for Visit / Clinical Objective</label>
                  <textarea
                    className="erp-input"
                    rows={3}
                    placeholder="Describe clinical symptoms or drug-gene interaction reassessment need..."
                    value={bookForm.reason}
                    onChange={(e) => setBookForm({ ...bookForm, reason: e.target.value })}
                  />
                </div>
              </div>

              <div className="erp-modal-header" style={{ justifyContent: 'flex-end', gap: '0.75rem', background: 'transparent' }}>
                <button
                  type="button"
                  className="erp-btn-secondary"
                  onClick={() => setShowBookModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="erp-btn-primary"
                  disabled={booking}
                >
                  {booking ? 'Scheduling...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
