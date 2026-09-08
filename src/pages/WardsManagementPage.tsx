import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErpNavigation } from '../components/ErpNavigation';
import {
  assignBedToPatient,
  fetchPatientRegistry,
  fetchWards,
} from '../services/erpService';
import { useAuth } from '../state/authStore';
import type { BedRecord, PatientRegistryItem, WardRecord } from '../types/domain';

export function WardsManagementPage() {
  const { hospital } = useAuth();
  const [wards, setWards] = useState<WardRecord[]>([]);
  const [patients, setPatients] = useState<PatientRegistryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Assign Bed Modal
  const [selectedWard, setSelectedWard] = useState<WardRecord | null>(null);
  const [selectedBed, setSelectedBed] = useState<BedRecord | null>(null);
  const [patientIdInput, setPatientIdInput] = useState('');
  const [patientNameInput, setPatientNameInput] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [wardList, patientList] = await Promise.all([
        fetchWards(),
        fetchPatientRegistry(),
      ]);
      setWards(wardList);
      setPatients(patientList);
    } catch (err) {
      console.error('Failed to load wards data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAssignModal = (ward: WardRecord, bed: BedRecord) => {
    setSelectedWard(ward);
    setSelectedBed(bed);
    setPatientIdInput(bed.patientId || '');
    setPatientNameInput(bed.patientName || '');
    setAssignError(null);
  };

  const handlePatientSelect = (pid: string) => {
    const p = patients.find((pat) => pat.patientId === pid);
    setPatientIdInput(pid);
    setPatientNameInput(p ? p.patientName : pid);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWard || !selectedBed) return;

    setAssigning(true);
    setAssignError(null);

    try {
      await assignBedToPatient({
        wardId: selectedWard.wardId,
        bedId: selectedBed.bedId,
        patientId: patientIdInput.trim() || null,
        patientName: patientNameInput.trim() || null,
      });

      setSelectedBed(null);
      setSelectedWard(null);
      await loadData();
    } catch (err: unknown) {
      setAssignError((err as Error)?.message || 'Failed to update bed allocation.');
    } finally {
      setAssigning(false);
    }
  };

  const handleFreeBed = async (wardId: string, bedId: string) => {
    if (!window.confirm(`Discharge patient and mark bed ${bedId} as Available?`)) {
      return;
    }

    try {
      await assignBedToPatient({
        wardId,
        bedId,
        patientId: null,
        patientName: null,
      });
      await loadData();
    } catch (err) {
      console.error('Failed to free bed:', err);
    }
  };

  const totalBeds = wards.reduce((sum, w) => sum + w.totalBeds, 0);
  const totalOccupied = wards.reduce((sum, w) => sum + w.occupiedBeds, 0);
  const occupancyPct = totalBeds > 0 ? Math.round((totalOccupied / totalBeds) * 100) : 0;

  return (
    <div className="erp-page-container">
      <ErpNavigation activeTab="wards" />

      <main className="erp-main-body">
        <div className="erp-page-header">
          <div className="erp-title-area">
            <h1>
              <span>🛏️</span> Wards & Inpatient Bed Allocation
            </h1>
            <p>
              Hospital bed matrix and real-time admission routing · {hospital?.name || 'Hospital'}
            </p>
          </div>

          <div className="erp-header-actions">
            <button
              type="button"
              className="erp-btn-secondary"
              onClick={loadData}
            >
              🔄 Refresh Matrix
            </button>
          </div>
        </div>

        {/* WARDS STATS */}
        <section className="erp-stats-grid">
          <div className="erp-stat-card" style={{ '--card-accent': '#22c7ff' } as React.CSSProperties}>
            <span className="erp-stat-label">Total Bed Capacity</span>
            <div className="erp-stat-value">{totalBeds}</div>
            <span className="erp-stat-meta">Across {wards.length} clinical wards</span>
          </div>

          <div className="erp-stat-card" style={{ '--card-accent': '#ef4444' } as React.CSSProperties}>
            <span className="erp-stat-label">Occupied Beds</span>
            <div className="erp-stat-value">{totalOccupied}</div>
            <span className="erp-stat-meta">Inpatients currently admitted</span>
          </div>

          <div className="erp-stat-card" style={{ '--card-accent': '#10b981' } as React.CSSProperties}>
            <span className="erp-stat-label">Available Beds</span>
            <div className="erp-stat-value">{totalBeds - totalOccupied}</div>
            <span className="erp-stat-meta">Open for immediate intake</span>
          </div>

          <div className="erp-stat-card" style={{ '--card-accent': '#8b5cf6' } as React.CSSProperties}>
            <span className="erp-stat-label">Hospital Occupancy</span>
            <div className="erp-stat-value">{occupancyPct}%</div>
            <span className="erp-stat-meta">Overall bed utilization index</span>
          </div>
        </section>

        {/* WARDS & BEDS GRID */}
        <div className="erp-wards-container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              Loading hospital wards and bed matrices...
            </div>
          ) : (
            wards.map((ward) => {
              const wardOccupancyPct =
                ward.totalBeds > 0 ? Math.round((ward.occupiedBeds / ward.totalBeds) * 100) : 0;

              return (
                <div key={ward.wardId} className="erp-ward-card">
                  <div className="erp-ward-header">
                    <div className="erp-ward-meta">
                      <h3>{ward.name}</h3>
                      <p>
                        Location: {ward.floor} · Capacity: {ward.occupiedBeds} / {ward.totalBeds} Beds Occupied
                      </p>
                    </div>

                    <div className="erp-ward-occupancy-bar">
                      <div className="erp-progress-track">
                        <div
                          className="erp-progress-fill"
                          style={{
                            width: `${wardOccupancyPct}%`,
                            background:
                              wardOccupancyPct > 85
                                ? '#ef4444'
                                : wardOccupancyPct > 60
                                  ? '#f59e0b'
                                  : '#10b981',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                        {wardOccupancyPct}%
                      </span>
                    </div>
                  </div>

                  <div className="erp-bed-grid">
                    {ward.beds.map((bed) => {
                      const isOccupied = bed.status === 'Occupied';
                      const isAvailable = bed.status === 'Available';

                      return (
                        <div
                          key={bed.bedId}
                          className={`erp-bed-card status-${bed.status}`}
                        >
                          <div className="erp-bed-header">
                            <span className="erp-bed-name">{bed.bedId}</span>
                            <span
                              className="erp-badge"
                              style={{
                                backgroundColor: isAvailable
                                  ? 'rgba(16, 185, 129, 0.2)'
                                  : isOccupied
                                    ? 'rgba(34, 199, 255, 0.2)'
                                    : 'rgba(245, 158, 11, 0.2)',
                                borderColor: isAvailable
                                  ? '#10b981'
                                  : isOccupied
                                    ? '#22c7ff'
                                    : '#f59e0b',
                                color: isAvailable
                                  ? '#6ee7b7'
                                  : isOccupied
                                    ? '#7be1ff'
                                    : '#fde68a',
                              }}
                            >
                              {bed.status}
                            </span>
                          </div>

                          <div className="erp-bed-patient">
                            {isOccupied ? (
                              <>
                                <strong>{bed.patientName || 'Patient'}</strong>
                                <span>ID: {bed.patientId}</span>
                                {bed.assignedAt && (
                                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.2rem' }}>
                                    Admitted: {new Date(bed.assignedAt).toLocaleDateString()}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span style={{ color: '#6ee7b7', fontStyle: 'italic', fontSize: '0.78rem' }}>
                                Ready for intake
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.5rem' }}>
                            {isOccupied ? (
                              <>
                                <Link
                                  to={`/dashboard?patientId=${encodeURIComponent(bed.patientId || '')}`}
                                  className="erp-action-btn-sm"
                                  style={{ flex: 1, textAlign: 'center', justifyContent: 'center' }}
                                >
                                  ⚡ Console
                                </Link>
                                <button
                                  type="button"
                                  className="erp-action-btn-sm"
                                  style={{ color: '#f87171' }}
                                  onClick={() => handleFreeBed(ward.wardId, bed.bedId)}
                                  title="Discharge & Free Bed"
                                >
                                  Free
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="erp-action-btn-sm"
                                style={{ flex: 1, justifyContent: 'center', borderColor: 'rgba(34, 199, 255, 0.4)' }}
                                onClick={() => openAssignModal(ward, bed)}
                              >
                                + Assign Bed
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* ASSIGN BED MODAL */}
      {selectedBed && selectedWard && (
        <div className="erp-modal-overlay">
          <div className="erp-modal-box" style={{ maxWidth: '540px' }}>
            <div className="erp-modal-header">
              <h2>
                <span>🛏️</span> Allocate Bed {selectedBed.bedId} · {selectedWard.name}
              </h2>
              <button
                type="button"
                className="erp-modal-close-btn"
                onClick={() => {
                  setSelectedBed(null);
                  setSelectedWard(null);
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAssignSubmit}>
              <div className="erp-modal-body">
                {assignError && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    {assignError}
                  </div>
                )}

                <div className="erp-form-grid">
                  <div className="erp-form-group">
                    <label>Select Existing Patient</label>
                    <select
                      className="erp-input"
                      value={patientIdInput}
                      onChange={(e) => handlePatientSelect(e.target.value)}
                    >
                      <option value="">-- Choose Patient --</option>
                      {patients.map((p) => (
                        <option key={p.patientId} value={p.patientId}>
                          {p.patientName} ({p.patientId})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="erp-form-group">
                    <label>Patient ID *</label>
                    <input
                      type="text"
                      className="erp-input"
                      value={patientIdInput}
                      onChange={(e) => setPatientIdInput(e.target.value)}
                      placeholder="e.g. PTC001X31"
                      required
                    />
                  </div>

                  <div className="erp-form-group">
                    <label>Patient Full Name</label>
                    <input
                      type="text"
                      className="erp-input"
                      value={patientNameInput}
                      onChange={(e) => setPatientNameInput(e.target.value)}
                      placeholder="e.g. Eleanor Vance"
                    />
                  </div>

                  <div className="erp-form-group">
                    <label>Assigned Bed</label>
                    <input
                      type="text"
                      className="erp-input"
                      value={`${selectedWard.name} · ${selectedBed.bedId}`}
                      disabled
                    />
                  </div>
                </div>
              </div>

              <div className="erp-modal-header" style={{ justifyContent: 'flex-end', gap: '0.75rem', background: 'transparent' }}>
                <button
                  type="button"
                  className="erp-btn-secondary"
                  onClick={() => {
                    setSelectedBed(null);
                    setSelectedWard(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="erp-btn-primary"
                  disabled={assigning}
                >
                  {assigning ? 'Allocating Bed...' : 'Confirm Bed Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
