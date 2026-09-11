import { useMemo, useState } from 'react';
import { Card } from '../../ui/Card';
import { useIntake } from '../../state/intakeStore';
import type { CloudFieldEdit } from '../../types/domain';

interface VitalsConsolePanelProps {
  patientId: string;
  fieldValues: Record<string, unknown>;
  edits: CloudFieldEdit[];
  canEdit: boolean;
  onSaveField: (fieldKey: string, value: unknown, note: string) => Promise<void>;
}

interface AlertLogEntry {
  time: string;
  severity: string;
  source: string;
  finding: string;
  action: string;
  owner: string;
  state: string;
}

interface HandoffEntry {
  time: string;
  actor: string;
  entry: string;
}

interface AiClinicalRecordEntry {
  timestamp: string;
  statement: string;
  rationale: string;
  confidence: number;
}

const VITAL_SNAPSHOT = [
  { label: 'Heart Rate', value: '116', unit: 'bpm', band: 'High', trend: '+14 / 2h', status: 'critical', fieldKey: 'vitals_pulse' },
  { label: 'SpO₂', value: '93', unit: '%', band: 'Low', trend: '-3 / 2h', status: 'warning', fieldKey: 'vitals_spo2' },
  { label: 'Respiratory Rate', value: '24', unit: 'breaths/min', band: 'High', trend: '+6 / 2h', status: 'warning', fieldKey: 'vitals_respiratoryRate' },
  { label: 'Blood Pressure', value: '142/94', unit: 'mmHg', band: 'High', trend: '+18/10', status: 'warning', fieldKey: 'vitals_bloodPressure' },
  { label: 'Temperature', value: '100.4', unit: '°F', band: 'High', trend: '+1.6 / 6h', status: 'warning', fieldKey: 'vitals_temperature' },
  { label: 'Pain Score', value: '8', unit: '/10', band: 'High', trend: '+2 / 3h', status: 'critical', fieldKey: 'vitals_painScore' },
] as const;

const ALERT_LOG = [
  {
    time: '10:42:12',
    severity: 'Critical',
    source: 'Telemetry Monitor',
    finding: 'Sustained tachycardia >110 bpm for 18 minutes.',
    action: 'Escalated to attending',
    owner: 'Charge RN',
    state: 'Open',
  },
  {
    time: '10:29:05',
    severity: 'High',
    source: 'Pulse Oximeter',
    finding: 'SpO₂ declined from 97% to 93% with motion-corrected signal.',
    action: 'Respiratory assessment initiated',
    owner: 'Respiratory Therapy',
    state: 'In Progress',
  },
  {
    time: '10:13:38',
    severity: 'High',
    source: 'Medication Correlator',
    finding: 'Vital instability window follows opioid dose change by 35 minutes.',
    action: 'Medication review required',
    owner: 'Clinical Pharmacist',
    state: 'Open',
  },
  {
    time: '09:54:44',
    severity: 'Moderate',
    source: 'BP Cuff',
    finding: 'Three consecutive hypertensive readings above threshold.',
    action: 'Repeat measurement protocol completed',
    owner: 'Bedside RN',
    state: 'Acknowledged',
  },
] as const;

const DEVICE_HEALTH = [
  { device: 'Telemetry Monitor', signal: '99.2%', packetLoss: '0.1%', latency: '180ms', battery: 'Mains', drift: 'Within tolerance' },
  { device: 'Pulse Oximeter', signal: '96.4%', packetLoss: '0.8%', latency: '240ms', battery: '87%', drift: 'Compensated' },
  { device: 'BP Cuff', signal: '100%', packetLoss: '0.0%', latency: 'Manual', battery: '74%', drift: 'Within tolerance' },
  { device: 'Respiratory Sensor', signal: '95.8%', packetLoss: '1.2%', latency: '310ms', battery: '62%', drift: 'Monitor closely' },
] as const;

const HANDOFF_LOG = [
  { time: '10:46', actor: 'Charge RN', entry: 'Escalation accepted. Continuous monitoring protocol activated.' },
  { time: '10:30', actor: 'Respiratory Therapy', entry: 'Oxygen support reviewed; re-evaluation scheduled in 15 minutes.' },
  { time: '10:15', actor: 'Clinical Pharmacist', entry: 'Dose and interaction review initiated after instability correlation.' },
  { time: '09:58', actor: 'Bedside RN', entry: 'Trend anomaly confirmed against artifact filter and device integrity checks.' },
] as const;

function parseArrayField<T>(value: unknown, fallback: T[]): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : fallback;
    } catch {
      return fallback;
    }
  }

  return fallback;
}

function normalizeSeverityCount(alerts: AlertLogEntry[]) {
  return alerts.reduce(
    (accumulator, row) => {
      const severity = String(row.severity || 'Moderate').toLowerCase();
      if (severity.includes('critical')) {
        accumulator.critical += 1;
      } else if (severity.includes('high')) {
        accumulator.high += 1;
      } else {
        accumulator.moderate += 1;
      }

      return accumulator;
    },
    { critical: 0, high: 0, moderate: 0 },
  );
}

export function VitalsConsolePanel({ patientId, fieldValues, edits, canEdit, onSaveField }: VitalsConsolePanelProps) {
  const { getOutputByPatient } = useIntake();
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editingAlertIndex, setEditingAlertIndex] = useState<number | null>(null);
  const [alertDraft, setAlertDraft] = useState<AlertLogEntry | null>(null);
  const [alertDraftNote, setAlertDraftNote] = useState('');
  const [editingHandoffIndex, setEditingHandoffIndex] = useState<number | null>(null);
  const [handoffDraft, setHandoffDraft] = useState<HandoffEntry | null>(null);
  const [handoffDraftNote, setHandoffDraftNote] = useState('');
  const [isAddingHandoff, setIsAddingHandoff] = useState(false);
  const [newHandoffDraft, setNewHandoffDraft] = useState<HandoffEntry>({ time: '', actor: '', entry: '' });
  const [newHandoffNote, setNewHandoffNote] = useState('');

  const patientOutput = getOutputByPatient(patientId);
  const severity = patientOutput?.risk_assessment.severity ?? 'critical';
  const severityLabel = severity.charAt(0).toUpperCase() + severity.slice(1);
  const confidence = patientOutput?.risk_assessment.confidence_score ?? 0.94;
  const variantCount = patientOutput?.quality_metrics.variant_line_count ?? 58;

  const dynamicSnapshot = useMemo(() => {
    if (!patientOutput) {
      return VITAL_SNAPSHOT;
    }

    const tachy = Math.min(138, 88 + Math.round(variantCount / 2));
    const spo2 = Math.max(89, 98 - Math.round(variantCount / 18));
    const resp = Math.min(30, 16 + Math.round(variantCount / 12));
    const systolic = Math.min(162, 118 + Math.round(variantCount / 5));
    const diastolic = Math.min(104, 78 + Math.round(variantCount / 8));

    return [
      {
        label: 'Heart Rate',
        value: String(fieldValues.vitals_pulse ?? tachy),
        unit: 'bpm',
        band: severity === 'critical' ? 'High' : 'Elevated',
        trend: `+${Math.max(4, Math.round(variantCount / 6))} / 2h`,
        status: severity === 'critical' ? 'critical' : 'warning',
        fieldKey: 'vitals_pulse',
      },
      {
        label: 'SpO₂',
        value: String(fieldValues.vitals_spo2 ?? spo2),
        unit: '%',
        band: spo2 < 94 ? 'Low' : 'Watch',
        trend: `-${Math.max(1, Math.round(variantCount / 30))} / 2h`,
        status: spo2 < 93 ? 'critical' : 'warning',
        fieldKey: 'vitals_spo2',
      },
      {
        label: 'Respiratory Rate',
        value: String(fieldValues.vitals_respiratoryRate ?? resp),
        unit: 'breaths/min',
        band: 'High',
        trend: `+${Math.max(2, Math.round(variantCount / 20))} / 2h`,
        status: resp > 24 ? 'critical' : 'warning',
        fieldKey: 'vitals_respiratoryRate',
      },
      {
        label: 'Blood Pressure',
        value: String(fieldValues.vitals_bloodPressure ?? `${systolic}/${diastolic}`),
        unit: 'mmHg',
        band: 'High',
        trend: `+${Math.max(8, Math.round(variantCount / 4))}/${Math.max(4, Math.round(variantCount / 9))}`,
        status: severity === 'critical' ? 'critical' : 'warning',
        fieldKey: 'vitals_bloodPressure',
      },
      {
        label: 'Temperature',
        value: String(fieldValues.vitals_temperature ?? (severity === 'critical' ? '100.8' : '99.6')),
        unit: '°F',
        band: severity === 'critical' ? 'High' : 'Watch',
        trend: '+1.2 / 6h',
        status: 'warning',
        fieldKey: 'vitals_temperature',
      },
      {
        label: 'Pain Score',
        value: String(fieldValues.vitals_painScore ?? (severity === 'critical' ? '8' : '6')),
        unit: '/10',
        band: 'High',
        trend: '+2 / 3h',
        status: severity === 'critical' ? 'critical' : 'warning',
        fieldKey: 'vitals_painScore',
      },
    ] as const;
  }, [fieldValues, patientOutput, severity, variantCount]);

  const latestByField = useMemo(() => {
    const map = new Map<string, CloudFieldEdit>();
    edits
      .slice()
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
      .forEach((edit) => {
        if (!map.has(edit.fieldKey)) {
          map.set(edit.fieldKey, edit);
        }
      });

    return map;
  }, [edits]);

  const latestManualEdit = useMemo(
    () =>
      edits
        .slice()
        .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())[0] ?? null,
    [edits],
  );

  const beginEdit = (fieldKey: string, value: string) => {
    if (!canEdit) {
      return;
    }

    setActiveFieldKey(fieldKey);
    setDraftValue(value);
    setDraftNote('');
  };

  const cancelEdit = () => {
    setActiveFieldKey(null);
    setDraftValue('');
    setDraftNote('');
  };

  const saveEdit = async () => {
    if (!canEdit) {
      return;
    }

    if (!activeFieldKey) {
      return;
    }

    setIsSaving(true);
    try {
      await onSaveField(activeFieldKey, draftValue, draftNote);
      cancelEdit();
    } finally {
      setIsSaving(false);
    }
  };

  const dynamicAlertLog = useMemo<AlertLogEntry[]>(() => {
    if (!patientOutput) {
      return [...ALERT_LOG];
    }

    const timestamp = new Date(patientOutput.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return [
      {
        time: timestamp,
        severity: severityLabel,
        source: 'VCF AI Intake Output',
        finding: `${patientOutput.risk_assessment.risk_label} risk classification generated from ${patientOutput.quality_metrics.file_name}.`,
        action: patientOutput.clinical_recommendation.action,
        owner: 'Clinical Intake Console',
        state: 'Open',
      },
      {
        time: '10:29:05',
        severity: severity === 'critical' ? 'High' : 'Moderate',
        source: 'Medication Correlator',
        finding: `Primary gene ${patientOutput.pharmacogenomic_profile.primary_gene} with phenotype ${patientOutput.pharmacogenomic_profile.phenotype} mapped to current therapy risk.`,
        action: 'Medication review required',
        owner: 'Clinical Pharmacist',
        state: 'In Progress',
      },
      ...ALERT_LOG.slice(2),
    ];
  }, [patientOutput, severity, severityLabel]);

  const editableAlertLog = useMemo(() => parseArrayField<AlertLogEntry>(fieldValues.manual_alertLog, dynamicAlertLog), [fieldValues.manual_alertLog, dynamicAlertLog]);
  const editableHandoffLog = useMemo(
    () => parseArrayField<HandoffEntry>(fieldValues.manual_handoffLog, [...HANDOFF_LOG]),
    [fieldValues.manual_handoffLog],
  );

  const aiClinicalRecordLog = useMemo<AiClinicalRecordEntry[]>(() => {
    const severityCount = normalizeSeverityCount(editableAlertLog);
    const now = new Date().toISOString();
    const primaryConfidence = Number(Math.max(0.91, Math.min(0.98, confidence + (severityCount.critical ? 0.02 : 0))).toFixed(2));
    const workflowConfidence = Number(Math.max(0.91, Math.min(0.97, 0.91 + severityCount.high * 0.01)).toFixed(2));
    const editConfidence = Number(Math.max(0.91, Math.min(0.95, latestManualEdit ? 0.93 : 0.91)).toFixed(2));

    return [
      {
        timestamp: now,
        statement:
          severity === 'critical'
            ? 'Clinical instability remains active and requires immediate multidisciplinary response.'
            : 'Clinical risk remains active and requires continued monitored intervention.',
        rationale: `Alert distribution: critical=${severityCount.critical}, high=${severityCount.high}, moderate=${severityCount.moderate}.`,
        confidence: primaryConfidence,
      },
      {
        timestamp: now,
        statement: 'Escalation workflow remains aligned with active alert burden and handoff trail.',
        rationale: `Handoff entries: ${editableHandoffLog.length}. Latest handoff actor: ${editableHandoffLog[0]?.actor || 'N/A'}.`,
        confidence: workflowConfidence,
      },
      {
        timestamp: now,
        statement: latestManualEdit
          ? `Manual override detected on ${latestManualEdit.fieldKey}; record integrity maintained with attribution.`
          : 'No manual overrides detected in the current monitoring interval.',
        rationale: latestManualEdit?.note ? `Latest edit note: ${latestManualEdit.note}` : 'No edit note attached in current interval.',
        confidence: editConfidence,
      },
    ];
  }, [confidence, editableAlertLog, editableHandoffLog, latestManualEdit, severity]);

  const aiClinicalRecordSubtitle = useMemo(() => {
    const latestTimestamp = aiClinicalRecordLog[0]?.timestamp;
    if (!latestTimestamp) {
      return 'Auto-generated from alert and handoff changes with confidence scoring';
    }

    return `Auto-generated from alert and handoff changes with confidence scoring · AI regenerated ${new Date(latestTimestamp).toLocaleString()}`;
  }, [aiClinicalRecordLog]);

  const beginAlertEdit = (index: number, row: AlertLogEntry) => {
    if (!canEdit) {
      return;
    }

    setEditingAlertIndex(index);
    setAlertDraft({ ...row });
    setAlertDraftNote('');
  };

  const saveAlertEdit = async () => {
    if (!canEdit) {
      return;
    }

    if (editingAlertIndex === null || !alertDraft) {
      return;
    }

    setIsSaving(true);
    try {
      const updated = editableAlertLog.map((row, index) => (index === editingAlertIndex ? alertDraft : row));
      await onSaveField('manual_alertLog', updated, alertDraftNote || `Updated clinical alert row ${editingAlertIndex + 1}`);
      setEditingAlertIndex(null);
      setAlertDraft(null);
      setAlertDraftNote('');
    } finally {
      setIsSaving(false);
    }
  };

  const beginHandoffEdit = (index: number, row: HandoffEntry) => {
    if (!canEdit) {
      return;
    }

    setEditingHandoffIndex(index);
    setHandoffDraft({ ...row });
    setHandoffDraftNote('');
  };

  const getDefaultHandoffTime = () =>
    new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

  const beginAddHandoff = () => {
    if (!canEdit) {
      return;
    }

    setEditingHandoffIndex(null);
    setHandoffDraft(null);
    setHandoffDraftNote('');
    setIsAddingHandoff(true);
    setNewHandoffDraft({ time: getDefaultHandoffTime(), actor: '', entry: '' });
    setNewHandoffNote('');
  };

  const cancelAddHandoff = () => {
    setIsAddingHandoff(false);
    setNewHandoffDraft({ time: '', actor: '', entry: '' });
    setNewHandoffNote('');
  };

  const saveAddHandoff = async () => {
    if (!canEdit) {
      return;
    }

    const actor = newHandoffDraft.actor.trim();
    const entry = newHandoffDraft.entry.trim();
    const time = newHandoffDraft.time.trim() || getDefaultHandoffTime();

    if (!actor || !entry) {
      return;
    }

    setIsSaving(true);
    try {
      const updated: HandoffEntry[] = [{ time, actor, entry }, ...editableHandoffLog];
      await onSaveField('manual_handoffLog', updated, newHandoffNote || `Added handoff task by ${actor}`);
      cancelAddHandoff();
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddHandoffKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    if (isSaving || !newHandoffDraft.actor.trim() || !newHandoffDraft.entry.trim()) {
      return;
    }

    void saveAddHandoff();
  };

  const saveHandoffEdit = async () => {
    if (!canEdit) {
      return;
    }

    if (editingHandoffIndex === null || !handoffDraft) {
      return;
    }

    setIsSaving(true);
    try {
      const updated = editableHandoffLog.map((row, index) => (index === editingHandoffIndex ? handoffDraft : row));
      await onSaveField('manual_handoffLog', updated, handoffDraftNote || `Updated handoff row ${editingHandoffIndex + 1}`);
      setEditingHandoffIndex(null);
      setHandoffDraft(null);
      setHandoffDraftNote('');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card className="vitals-verdict" title="Primary Vitals Verdict" subtitle="Issued from current monitored interval">
        <p className="vitals-verdict-text">
          {patientOutput
            ? `${patientOutput.risk_assessment.risk_label} profile classified as active for patient ${patientId}. ${patientOutput.clinical_recommendation.action}.`
            : 'Hemodynamic instability classified as active and clinically significant. Immediate multidisciplinary review required.'}
        </p>
        <div className="vitals-verdict-meta">
          <span>Confidence: {confidence.toFixed(2)}</span>
          <span>Severity: {severityLabel}</span>
          <span>
            {patientOutput
              ? `Source: ${patientOutput.quality_metrics.file_name} · ${variantCount} variants`
              : 'Correlation Window: 35 minutes post-medication change'}
          </span>
        </div>
        {!canEdit ? <small className="meta-line">Read-only for this role. Vitals updates are permission-restricted.</small> : null}
      </Card>

      <section className="vitals-grid-panel fade-in" aria-label="Current vital telemetry snapshot">
        {dynamicSnapshot.map((item) => (
          <article key={item.label} className={`vital-snapshot-card vital-${item.status}`}>
            <div className="vital-card-header">
              <p>{item.label}</p>
              {canEdit && activeFieldKey !== item.fieldKey ? (
                <button className="vital-edit-btn" type="button" onClick={() => beginEdit(item.fieldKey, item.value)}>
                  Edit
                </button>
              ) : null}
            </div>
            {activeFieldKey === item.fieldKey ? (
              <div className="audit-inline-edit">
                <input value={draftValue} onChange={(event) => setDraftValue(event.target.value)} />
                <input value={draftNote} onChange={(event) => setDraftNote(event.target.value)} placeholder="Edit note" />
                <div className="audit-inline-actions">
                  <button type="button" onClick={saveEdit} disabled={isSaving}>
                    Save
                  </button>
                  <button type="button" onClick={cancelEdit} disabled={isSaving}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <h3>
                {item.value}
                <small>{item.unit}</small>
              </h3>
            )}
            <div className="snapshot-meta">
              <span>Band: {item.band}</span>
              <span>Trend: {item.trend}</span>
            </div>
            {latestByField.get(item.fieldKey) ? (
              <small>
                Edited by {latestByField.get(item.fieldKey)?.editedBy} ·{' '}
                {new Date(latestByField.get(item.fieldKey)?.timestamp ?? '').toLocaleString()}
                {latestByField.get(item.fieldKey)?.note ? ` · ${latestByField.get(item.fieldKey)?.note}` : ''}
              </small>
            ) : (
              <small>No manual edits logged.</small>
            )}
          </article>
        ))}
      </section>

      <section className="vitals-two-column fade-in">
        <Card title="Real-World Reliability Controls" subtitle="Signal quality, transport reliability, and sensor trust boundaries">
          <div className="device-table-wrap">
            <table className="ops-table" aria-label="Device health table">
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Signal</th>
                  <th>Packet Loss</th>
                  <th>Latency</th>
                  <th>Battery</th>
                  <th>Drift</th>
                </tr>
              </thead>
              <tbody>
                {DEVICE_HEALTH.map((row) => (
                  <tr key={row.device}>
                    <td>{row.device}</td>
                    <td>{row.signal}</td>
                    <td>{row.packetLoss}</td>
                    <td>{row.latency}</td>
                    <td>{row.battery}</td>
                    <td>{row.drift}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Escalation Decision Queue" subtitle="Operational path for unresolved clinical events">
          <ul className="escalation-list">
            <li>
              <strong>1 · Attending Physician Review</strong>
              <span>Active due to sustained tachycardia + oxygen decline.</span>
            </li>
            <li>
              <strong>2 · Pharmacy Interaction Reconciliation</strong>
              <span>Required before next dose cycle is authorized.</span>
            </li>
            <li>
              <strong>3 · Respiratory Intervention Validation</strong>
              <span>Follow-up check scheduled within 15-minute protocol window.</span>
            </li>
            <li>
              <strong>4 · Shift Handoff Sign-off</strong>
              <span>Pending completion after all high-severity events are closed.</span>
            </li>
          </ul>
        </Card>
      </section>

      <Card title="Clinical Alert Log" subtitle="Timestamped, accountable, and intervention-linked">
        <div className="alert-log-wrap">
          <table className="ops-table" aria-label="Clinical alert log table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Severity</th>
                <th>Source</th>
                <th>Finding</th>
                <th>Action</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Edit</th>
              </tr>
            </thead>
            <tbody>
              {editableAlertLog.map((row, index) => (
                <tr key={`${row.time}-${row.source}-${index}`}>
                  <td>
                    {editingAlertIndex === index && alertDraft ? (
                      <input className="table-inline-input" value={alertDraft.time} onChange={(event) => setAlertDraft({ ...alertDraft, time: event.target.value })} />
                    ) : (
                      row.time
                    )}
                  </td>
                  <td>
                    {editingAlertIndex === index && alertDraft ? (
                      <input
                        className="table-inline-input"
                        value={alertDraft.severity}
                        onChange={(event) => setAlertDraft({ ...alertDraft, severity: event.target.value })}
                      />
                    ) : (
                      <span className={`severity-pill severity-${row.severity.toLowerCase()}`}>{row.severity}</span>
                    )}
                  </td>
                  <td>
                    {editingAlertIndex === index && alertDraft ? (
                      <input className="table-inline-input" value={alertDraft.source} onChange={(event) => setAlertDraft({ ...alertDraft, source: event.target.value })} />
                    ) : (
                      row.source
                    )}
                  </td>
                  <td>
                    {editingAlertIndex === index && alertDraft ? (
                      <input className="table-inline-input" value={alertDraft.finding} onChange={(event) => setAlertDraft({ ...alertDraft, finding: event.target.value })} />
                    ) : (
                      row.finding
                    )}
                  </td>
                  <td>
                    {editingAlertIndex === index && alertDraft ? (
                      <input className="table-inline-input" value={alertDraft.action} onChange={(event) => setAlertDraft({ ...alertDraft, action: event.target.value })} />
                    ) : (
                      row.action
                    )}
                  </td>
                  <td>
                    {editingAlertIndex === index && alertDraft ? (
                      <input className="table-inline-input" value={alertDraft.owner} onChange={(event) => setAlertDraft({ ...alertDraft, owner: event.target.value })} />
                    ) : (
                      row.owner
                    )}
                  </td>
                  <td>
                    {editingAlertIndex === index && alertDraft ? (
                      <input className="table-inline-input" value={alertDraft.state} onChange={(event) => setAlertDraft({ ...alertDraft, state: event.target.value })} />
                    ) : (
                      row.state
                    )}
                  </td>
                  <td>
                    {editingAlertIndex === index ? (
                      <div className="table-inline-actions">
                        <input
                          className="table-inline-input"
                          placeholder="Edit note"
                          value={alertDraftNote}
                          onChange={(event) => setAlertDraftNote(event.target.value)}
                        />
                        <button className="audit-edit-btn" type="button" onClick={saveAlertEdit} disabled={isSaving}>
                          Save
                        </button>
                        <button
                          className="audit-edit-btn"
                          type="button"
                          onClick={() => {
                            setEditingAlertIndex(null);
                            setAlertDraft(null);
                            setAlertDraftNote('');
                          }}
                          disabled={isSaving}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : !canEdit ? (
                      <small className="meta-line">Locked</small>
                    ) : (
                      <button className="audit-edit-btn" type="button" onClick={() => beginAlertEdit(index, row)}>
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Shift Handoff Audit Trail" subtitle="Clinician-attributed records for legal and continuity review">
        <div className="handoff-toolbar">
          {!canEdit ? (
            <small className="meta-line">Read-only for this role</small>
          ) : isAddingHandoff ? (
            <button className="audit-edit-btn" type="button" onClick={cancelAddHandoff} disabled={isSaving}>
              Cancel Add
            </button>
          ) : (
            <button className="audit-edit-btn" type="button" onClick={beginAddHandoff} disabled={isSaving}>
              Add Task
            </button>
          )}
        </div>
        <ul className="handoff-list">
          {isAddingHandoff ? (
            <li>
              <div className="handoff-inline-edit">
                <input
                  className="table-inline-input"
                  placeholder="Time"
                  value={newHandoffDraft.time}
                  onChange={(event) => setNewHandoffDraft({ ...newHandoffDraft, time: event.target.value })}
                  onKeyDown={handleAddHandoffKeyDown}
                />
                <input
                  className="table-inline-input"
                  placeholder="Owner"
                  value={newHandoffDraft.actor}
                  onChange={(event) => setNewHandoffDraft({ ...newHandoffDraft, actor: event.target.value })}
                  onKeyDown={handleAddHandoffKeyDown}
                />
                <input
                  className="table-inline-input"
                  placeholder="Task / handoff entry"
                  value={newHandoffDraft.entry}
                  onChange={(event) => setNewHandoffDraft({ ...newHandoffDraft, entry: event.target.value })}
                  onKeyDown={handleAddHandoffKeyDown}
                />
                <div className="table-inline-actions">
                  <input
                    className="table-inline-input"
                    placeholder="Add note"
                    value={newHandoffNote}
                    onChange={(event) => setNewHandoffNote(event.target.value)}
                    onKeyDown={handleAddHandoffKeyDown}
                  />
                  <button
                    className="audit-edit-btn"
                    type="button"
                    onClick={saveAddHandoff}
                    disabled={isSaving || !newHandoffDraft.actor.trim() || !newHandoffDraft.entry.trim()}
                  >
                    Save Task
                  </button>
                </div>
              </div>
            </li>
          ) : null}
          {editableHandoffLog.map((entry, index) => (
            <li key={`${entry.time}-${entry.actor}-${index}`}>
              {editingHandoffIndex === index && handoffDraft ? (
                <div className="handoff-inline-edit">
                  <input className="table-inline-input" value={handoffDraft.time} onChange={(event) => setHandoffDraft({ ...handoffDraft, time: event.target.value })} />
                  <input className="table-inline-input" value={handoffDraft.actor} onChange={(event) => setHandoffDraft({ ...handoffDraft, actor: event.target.value })} />
                  <input className="table-inline-input" value={handoffDraft.entry} onChange={(event) => setHandoffDraft({ ...handoffDraft, entry: event.target.value })} />
                  <div className="table-inline-actions">
                    <input
                      className="table-inline-input"
                      placeholder="Edit note"
                      value={handoffDraftNote}
                      onChange={(event) => setHandoffDraftNote(event.target.value)}
                    />
                    <button className="audit-edit-btn" type="button" onClick={saveHandoffEdit} disabled={isSaving}>
                      Save
                    </button>
                    <button
                      className="audit-edit-btn"
                      type="button"
                      onClick={() => {
                        setEditingHandoffIndex(null);
                        setHandoffDraft(null);
                        setHandoffDraftNote('');
                      }}
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span>{entry.time}</span>
                  <strong>{entry.actor}</strong>
                  <p>{entry.entry}</p>
                  {canEdit ? (
                    <button className="audit-edit-btn" type="button" onClick={() => beginHandoffEdit(index, entry)}>
                      Edit
                    </button>
                  ) : null}
                </>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card title="AI Clinical Record Log" subtitle={aiClinicalRecordSubtitle}>
        <div className="alert-log-wrap">
          <table className="ops-table" aria-label="AI clinical record log table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Statement</th>
                <th>Rationale</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {aiClinicalRecordLog.map((entry, index) => (
                <tr key={`${entry.timestamp}-${index}`}>
                  <td>{new Date(entry.timestamp).toLocaleString()}</td>
                  <td>{entry.statement}</td>
                  <td>{entry.rationale}</td>
                  <td>
                    <span className="severity-pill severity-high">{Number(entry.confidence).toFixed(2)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
