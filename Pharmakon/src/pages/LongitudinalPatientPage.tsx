import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { AggregatedPatientRecord, FieldConflict, HospitalPatientSnapshot } from '../types/domain';
import { fetchAggregatedPatientRecord, isApiRequestError } from '../services/cloudPatientService';
import { useAuth } from '../state/authStore';
import './LongitudinalPatientPage.css';

export function LongitudinalPatientPage() {
  const { longitudinalId } = useParams<{ longitudinalId: string }>();
  const navigate = useNavigate();
  const { hospitals } = useAuth();
  const [data, setData] = useState<AggregatedPatientRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!longitudinalId) {
      setError('Longitudinal ID is required');
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchAggregatedPatientRecord(longitudinalId);
        setData(result);
      } catch (err) {
        if (isApiRequestError(err)) {
          if (err.status === 404) {
            setError('Longitudinal patient identity not found.');
          } else if (err.status === 403) {
            setError('Insufficient permissions to access this longitudinal record.');
          } else {
            setError(err.message || 'Failed to load longitudinal patient data.');
          }
        } else {
          setError('Failed to load longitudinal patient data.');
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [longitudinalId]);

  const getHospitalName = (hospitalId: string): string => {
    const hospital = hospitals.find((h) => h.hospital_id === hospitalId);
    return hospital?.name || hospitalId;
  };

  if (loading) {
    return (
      <div className="longitudinal-page">
        <div className="loading">Loading longitudinal patient data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="longitudinal-page">
        <div className="error-container">
          <div className="error-message">{error}</div>
          <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="longitudinal-page">
        <div className="error-container">
          <div className="error-message">No data available.</div>
          <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="longitudinal-page">
      <div className="demo-banner">DEMO / SYNTHETIC DATA</div>

      <div className="header">
        <h1>Longitudinal Patient Record</h1>
        <p className="longitudinal-id">ID: {data.longitudinalId}</p>
        <button className="back-button" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>

      <div className="summary-section">
        <h2>Cross-Hospital Summary</h2>
        <div className="summary-grid">
          <div className="summary-item">
            <div className="summary-label">Connected Hospitals</div>
            <div className="summary-value">{data.snapshots.length}</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Records Retrieved</div>
            <div className="summary-value">{data.totalRecordsRetrieved}</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Records Unavailable</div>
            <div className="summary-value">{data.totalRecordsUnavailable}</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">Conflicts Detected</div>
            <div className="summary-value">{data.conflicts.length}</div>
          </div>
        </div>
      </div>

      <div className="snapshots-section">
        <h2>Hospital Sources</h2>
        <div className="snapshots-list">
          {data.snapshots.map((snapshot) => (
            <SnapshotCard key={`${snapshot.hospitalId}-${snapshot.patientId}`} snapshot={snapshot} getHospitalName={getHospitalName} />
          ))}
        </div>
      </div>

      {data.conflicts.length > 0 && (
        <div className="conflicts-section">
          <h2>DATA CONFLICTS DETECTED</h2>
          <div className="conflicts-note">Conflicting source data has been preserved. No automatic resolution was performed.</div>
          <div className="conflicts-list">
            {data.conflicts.map((conflict) => (
              <ConflictItem key={conflict.field} conflict={conflict} />
            ))}
          </div>
        </div>
      )}

      <div className="footer">
        <p className="retrieved-at">Retrieved: {new Date(data.retrievedAt).toLocaleString()}</p>
      </div>
    </div>
  );
}

function SnapshotCard({ snapshot, getHospitalName }: { snapshot: HospitalPatientSnapshot; getHospitalName: (id: string) => string }) {
  const record = snapshot.record;
  const hospitalName = getHospitalName(snapshot.hospitalId);

  return (
    <div className="snapshot-card">
      <div className="snapshot-header">
        <h3>{hospitalName}</h3>
        <span className="hospital-id">{snapshot.hospitalId}</span>
      </div>

      <div className="snapshot-info">
        <div className="info-row">
          <span className="info-label">Local Patient ID:</span>
          <span className="info-value">{snapshot.patientId}</span>
        </div>

        {snapshot.error && (
          <div className="info-row error">
            <span className="info-label">Status:</span>
            <span className="info-value">Unavailable - {snapshot.error}</span>
          </div>
        )}

        {!record && !snapshot.error && (
          <div className="info-row">
            <span className="info-label">Status:</span>
            <span className="info-value">Unavailable</span>
          </div>
        )}

        {record && (
          <>
            <div className="snapshot-section-divider" />
            <div className="info-row">
              <span className="info-label">Risk Label:</span>
              <span className="info-value">{(record.fields?.riskLabel as string) || 'N/A'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Severity:</span>
              <span className="info-value">{(record.fields?.severity as string) || 'N/A'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Confidence:</span>
              <span className="info-value">{(record.fields?.confidence as number)?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className="snapshot-section-divider" />
            <div className="info-row">
              <span className="info-label">Primary Gene:</span>
              <span className="info-value">{(record.fields?.primaryGene as string) || 'N/A'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Diplotype:</span>
              <span className="info-value">{(record.fields?.diplotype as string) || 'N/A'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Phenotype:</span>
              <span className="info-value">{(record.fields?.phenotype as string) || 'N/A'}</span>
            </div>
            <div className="snapshot-section-divider" />
            <div className="info-row">
              <span className="info-label">Last Updated:</span>
              <span className="info-value">{new Date(record.updatedAt).toLocaleString()}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ConflictItem({ conflict }: { conflict: FieldConflict }) {
  return (
    <div className="conflict-item">
      <div className="conflict-field">
        <strong>{conflict.field}</strong>
      </div>
      <div className="conflict-status">MANUAL_REVIEW_REQUIRED</div>
      <div className="conflict-values">
        {conflict.values.map((val, idx) => (
          <div key={idx} className="conflict-value">
            <div className="conflict-value-header">
              {val.hospitalId} · {val.patientId}
            </div>
            <div className="conflict-value-data">
              <code>{JSON.stringify(val.value)}</code>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
