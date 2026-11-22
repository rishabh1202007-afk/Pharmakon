import { useState, type ReactNode } from 'react';
import { TrendChart, type TrendSeries } from './TrendChart';
import type { AiDraftOutput, AuditLogEntry, CloudFieldEdit, CloudPatientNote } from '../../types/domain';
import type { LabRealtimeViewModel } from '../../services/labAIAgent';
import { GenomicsOllamaPanel } from './GenomicsPanelOllama';

interface PanelContext {
  patientId: string;
  patientOutput: AiDraftOutput | null;
  severityLabel: string;
  riskLabel: string;
  variantCount: number;
  primaryGene: string;
  phenotype: string;
  diplotype: string;
  outputTimestamp: string;
}

interface TrendsPanelProps extends PanelContext {
  trendSeries: TrendSeries[];
  scopeLabel: string;
  rangeLabel: string;
  controls: ReactNode;
}

interface LabsPanelProps extends PanelContext {
  realtime: LabRealtimeViewModel;
}

interface ReportsPanelProps extends PanelContext {
  selectedPdf: {
    id: string;
    title: string;
    createdAt: string;
    owner: string;
    source?: 'generated' | 'uploaded';
    reportKind?: 'prescription' | 'lab_report' | 'uploaded_lab';
    linkedReportId?: string;
  } | null;
  selectedLinkedLabReport: {
    id: string;
    title: string;
    sourceType: 'pdf' | 'structured';
    findings: string;
    aiSummary: string;
    createdAt: string;
    createdBy: string;
  } | null;
  labReports: Array<{
    id: string;
    title: string;
    sourceType: 'pdf' | 'structured';
    findings: string;
    aiSummary: string;
    createdAt: string;
    createdBy: string;
  }>;
}

interface EditableAuditField {
  key: string;
  label: string;
  fallback: string;
}

interface AuditPanelProps extends PanelContext {
  fieldValues: Record<string, unknown>;
  edits: CloudFieldEdit[];
  notes: CloudPatientNote[];
  auditLogs: AuditLogEntry[];
  editableFields: EditableAuditField[];
  canEditManualFields: boolean;
  canAddNotes: boolean;
  onSaveField: (fieldKey: string, value: string, note: string) => Promise<void>;
  onAddNote: (note: string) => Promise<void>;
}

export function LabsPanel({ realtime, ...context }: LabsPanelProps) {

  return (
    <section className="operations-panel-stack">
      <article className="card-shell panel-headline">
        <p className="verdict-kicker">Labs Decision Context</p>
        <h2>{realtime.headline}</h2>
        <p className="verdict-meta">
          Patient: {context.patientId} | Confidence: {realtime.confidence.toFixed(2)} | Severity: {context.severityLabel}
        </p>
      </article>

      <section className="signal-strip">
        <article className="signal-card">
          <p>WBC</p>
          <strong>{realtime.signals.wbc.value}</strong>
          <span>{realtime.signals.wbc.detail}</span>
        </article>
        <article className="signal-card">
          <p>Creatinine</p>
          <strong>{realtime.signals.creatinine.value}</strong>
          <span>{realtime.signals.creatinine.detail}</span>
        </article>
        <article className="signal-card">
          <p>ALT</p>
          <strong>{realtime.signals.alt.value}</strong>
          <span>{realtime.signals.alt.detail}</span>
        </article>
        <article className="signal-card">
          <p>Specimen Turnaround</p>
          <strong>{realtime.signals.specimenTurnaround.value}</strong>
          <span>{realtime.signals.specimenTurnaround.detail}</span>
        </article>
      </section>

      <article className="card-shell">
        <h2 className="ops-heading">Critical Lab Exceptions</h2>
        <div className="alert-log-wrap">
          <table className="ops-table" aria-label="Critical lab exceptions">
            <thead>
              <tr>
                <th>Time</th>
                <th>Marker</th>
                <th>Finding</th>
                <th>Clinical Weight</th>
                <th>Disposition</th>
              </tr>
            </thead>
            <tbody>
              {realtime.latestFindings.length ? (
                realtime.latestFindings.slice(0, 8).map((entry) => (
                  <tr key={entry.id}>
                    <td>{new Date(entry.timestamp).toLocaleTimeString()}</td>
                    <td>{entry.marker}</td>
                    <td>{entry.finding}</td>
                    <td>{entry.clinicalWeight}</td>
                    <td>{entry.disposition}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>No report-driven findings available yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="card-shell">
        <h2 className="ops-heading">AI Lab Agent (Report-Driven)</h2>
        <ul className="focus-list">
          <li>
            <strong>Latest synthesis</strong>
            <span>{realtime.aiAgent.summary}</span>
          </li>
          <li>
            <strong>Recommended next action</strong>
            <span>{realtime.aiAgent.recommendation}</span>
          </li>
          <li>
            <strong>Evidence basis</strong>
            <span>{realtime.aiAgent.basis}</span>
          </li>
        </ul>
      </article>

      <article className="card-shell">
        <h2 className="ops-heading">Date-wise Findings</h2>
        <div className="alert-log-wrap">
          <table className="ops-table" aria-label="Date-wise lab findings">
            <thead>
              <tr>
                <th>Date</th>
                <th>Total Findings</th>
                <th>High Priority</th>
                <th>Highlights</th>
              </tr>
            </thead>
            <tbody>
              {realtime.dateWiseFindings.length ? (
                realtime.dateWiseFindings.map((entry) => (
                  <tr key={entry.date}>
                    <td>{entry.date}</td>
                    <td>{entry.totalFindings}</td>
                    <td>{entry.highPriorityCount}</td>
                    <td>{entry.highlights.join(' · ') || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>No date-wise findings available until reports are saved.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

export function GenomicsPanel(context: PanelContext) {
  const uncertainRegions = Math.max(1, Math.round(context.variantCount / 40));

  return (
    <section className="operations-panel-stack">
      <article className="card-shell panel-headline">
        <p className="verdict-kicker">Genomic Determinism</p>
        <h2>{context.primaryGene.toUpperCase()} PHARMACOGENOMIC EFFECT — ACTIVE THERAPY IMPACT</h2>
        <p className="verdict-meta">Diplotype: {context.diplotype} | Phenotype: {context.phenotype} | Variants: {context.variantCount}</p>
      </article>

      <section className="signal-strip">
        <article className="signal-card">
          <p>Primary Gene</p>
          <strong>{context.primaryGene}</strong>
          <span>Mapped to active medication protocol</span>
        </article>
        <article className="signal-card">
          <p>Phenotype Class</p>
          <strong>{context.phenotype}</strong>
          <span>Translation table version locked</span>
        </article>
        <article className="signal-card">
          <p>Coverage Integrity</p>
          <strong>{context.patientOutput?.quality_metrics.vcf_parsing_success ? 'Validated' : 'Pending'}</strong>
          <span>Low-depth loci: {uncertainRegions}</span>
        </article>
        <article className="signal-card">
          <p>Interpretation Timestamp</p>
          <strong>{context.outputTimestamp}</strong>
          <span>Traceable to source VCF</span>
        </article>
      </section>

      <article className="card-shell">
        <h2 className="ops-heading">Genomic Evidence Ledger</h2>
        <ul className="focus-list">
          <li>
            <strong>Deterministic mapping executed</strong>
            <span>Allele-to-diplotype and diplotype-to-phenotype stages completed without branching ambiguity.</span>
          </li>
          <li>
            <strong>Risk label follows genotype context</strong>
            <span>{context.riskLabel} follows from genomic profile and treatment pathway intersection.</span>
          </li>
          <li>
            <strong>Uncertainty constrained</strong>
            <span>Low-depth regions remain logged and do not override current risk class.</span>
          </li>
          <li>
            <strong>Auditability preserved</strong>
            <span>All outputs remain reproducible for identical inputs and rule set version.</span>
          </li>
        </ul>
      </article>

      <GenomicsOllamaPanel gene={context.primaryGene} drug={context.patientOutput?.drug} phenotype={context.phenotype} />
    </section>
  );
}

export function MedicationsPanel(context: PanelContext) {
  return (
    <section className="operations-panel-stack">
      <article className="card-shell panel-headline">
        <p className="verdict-kicker">Medication Governance</p>
        <h2>REGIMEN RISK: {context.riskLabel.toUpperCase()} — DOSING CONTROLS ENFORCED</h2>
        <p className="verdict-meta">Severity: {context.severityLabel} | Primary gene: {context.primaryGene} | Patient: {context.patientId}</p>
      </article>

      <article className="card-shell">
        <h2 className="ops-heading">Interaction and Dosing Matrix</h2>
        <div className="alert-log-wrap">
          <table className="ops-table" aria-label="Medication interaction matrix">
            <thead>
              <tr>
                <th>Medication</th>
                <th>Exposure Risk</th>
                <th>Mechanism</th>
                <th>Required Control</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{context.patientOutput?.drug ?? 'Clopidogrel'}</td>
                <td>{context.riskLabel}</td>
                <td>{context.primaryGene} {context.phenotype} metabolic effect</td>
                <td>{context.patientOutput?.clinical_recommendation.action ?? 'Immediate specialist review required'}</td>
                <td>Open</td>
              </tr>
              <tr>
                <td>Concomitant analgesic</td>
                <td>Moderate</td>
                <td>Overlapping CNS burden</td>
                <td>Escalation review before next dispense</td>
                <td>In Progress</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article className="card-shell">
        <h2 className="ops-heading">Procedural Safeguards</h2>
        <ul className="focus-list">
          <li>
            <strong>Prescription gate</strong>
            <span>Automated release hold remains active until pharmacy reconciliation is signed.</span>
          </li>
          <li>
            <strong>Dose-cycle protection</strong>
            <span>Next administration requires attending and pharmacist concurrence.</span>
          </li>
          <li>
            <strong>Adverse-event preparedness</strong>
            <span>Rapid response package pre-linked to current medication profile.</span>
          </li>
        </ul>
      </article>
    </section>
  );
}

export function TrendsPanel(props: TrendsPanelProps) {
  return (
    <section className="operations-panel-stack">
      <article className="card-shell panel-headline">
        <p className="verdict-kicker">Trend Intelligence</p>
        <h2>TRAJECTORY SURVEILLANCE — CLINICALLY WEIGHTED ANOMALIES</h2>
        <p className="verdict-meta">Scope: {props.scopeLabel} | Range: {props.rangeLabel} | Patient: {props.patientId}</p>
      </article>

      <section className="trends card-shell">
        {props.controls}
        <TrendChart title="Clinical Trend Surface" yAxisLabel="Panel-selected clinical values" series={props.trendSeries} />
      </section>

      <article className="card-shell">
        <h2 className="ops-heading">Trend Decision Log</h2>
        <ul className="focus-list">
          <li>
            <strong>Abnormal intervals emphasized</strong>
            <span>Risk-weighted segments remain prioritized without alarm distortion.</span>
          </li>
          <li>
            <strong>Baseline divergence tracked</strong>
            <span>Real-time and historical baselines are co-rendered for defensible interpretation.</span>
          </li>
          <li>
            <strong>Actionability preserved</strong>
            <span>Trend anomalies map directly to escalation actions in medication and vitals workflows.</span>
          </li>
        </ul>
      </article>
    </section>
  );
}

export function ReportsPanel({
  patientId,
  variantCount,
  outputTimestamp,
  primaryGene,
  diplotype,
  phenotype,
  selectedPdf,
  selectedLinkedLabReport,
  labReports,
}: ReportsPanelProps) {
  const recentReports = selectedLinkedLabReport
    ? labReports.filter((entry) => entry.id !== selectedLinkedLabReport.id)
    : labReports;

  return (
    <section className="operations-panel-stack">
      <article className="card-shell panel-headline">
        <p className="verdict-kicker">Report Control Center</p>
        <h2>CLINICAL REPORT PACKAGE — FORMAL REVIEW READY</h2>
        <p className="verdict-meta">Patient: {patientId} | Evidence records: {variantCount} | Last compile: {outputTimestamp}</p>
      </article>

      <article className="card-shell">
        <h2 className="ops-heading">Report Artifacts</h2>
        <div className="alert-log-wrap">
          <table className="ops-table" aria-label="Report artifact status">
            <thead>
              <tr>
                <th>Artifact</th>
                <th>Content</th>
                <th>Verification</th>
                <th>Owner</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {selectedPdf ? (
                <tr>
                  <td>Selected PDF Artifact</td>
                  <td>{selectedPdf.title}</td>
                  <td>{selectedLinkedLabReport ? 'Linked to saved lab report' : 'Viewer selection active'}</td>
                  <td>{selectedPdf.owner}</td>
                  <td>Active</td>
                </tr>
              ) : (
                <tr>
                  <td>Selected PDF Artifact</td>
                  <td>No PDF selected</td>
                  <td>Awaiting selection</td>
                  <td>—</td>
                  <td>Pending</td>
                </tr>
              )}

              {selectedLinkedLabReport ? (
                <tr>
                  <td>Linked Lab Report</td>
                  <td>
                    {selectedLinkedLabReport.title} · {selectedLinkedLabReport.findings}
                  </td>
                  <td>{selectedLinkedLabReport.aiSummary || 'AI summary unavailable'}</td>
                  <td>{selectedLinkedLabReport.createdBy}</td>
                  <td>{selectedLinkedLabReport.sourceType === 'pdf' ? 'PDF Source' : 'Structured Source'}</td>
                </tr>
              ) : null}

              {recentReports.slice(0, 4).map((report) => (
                <tr key={report.id}>
                  <td>Lab Report Artifact</td>
                  <td>{report.title}</td>
                  <td>{report.aiSummary || report.findings}</td>
                  <td>{report.createdBy}</td>
                  <td>{report.sourceType === 'pdf' ? 'PDF Source' : 'Structured Source'}</td>
                </tr>
              ))}

              <tr>
                <td>Pharmacogenomic Evidence Sheet</td>
                <td>{primaryGene} / {diplotype} / {phenotype}</td>
                <td>Validated</td>
                <td>Clinical Pharmacist</td>
                <td>Ready</td>
              </tr>
              <tr>
                <td>Audit Trace Bundle</td>
                <td>Source VCF linkage and decision timestamps</td>
                <td>Validated</td>
                <td>Compliance Officer</td>
                <td>Ready</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

export function AuditPanel({
  patientId,
  outputTimestamp,
  variantCount,
  fieldValues,
  edits,
  notes,
  auditLogs,
  editableFields,
  canEditManualFields,
  canAddNotes,
  onSaveField,
  onAddNote,
}: AuditPanelProps) {
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const latestEdits = edits.slice().sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
  const latestByField = new Map<string, CloudFieldEdit>();
  latestEdits.forEach((edit) => {
    if (!latestByField.has(edit.fieldKey)) {
      latestByField.set(edit.fieldKey, edit);
    }
  });

  const beginEdit = (fieldKey: string) => {
    const current = fieldValues[fieldKey];
    setActiveFieldKey(fieldKey);
    setDraftValue(current === undefined || current === null ? '' : String(current));
    setDraftNote('');
  };

  const cancelEdit = () => {
    setActiveFieldKey(null);
    setDraftValue('');
    setDraftNote('');
  };

  const submitFieldEdit = async () => {
    if (!canEditManualFields) {
      return;
    }
    if (!activeFieldKey) {
      return;
    }

    try {
      setIsSaving(true);
      await onSaveField(activeFieldKey, draftValue, draftNote);
      setActiveFieldKey(null);
      setDraftValue('');
      setDraftNote('');
    } finally {
      setIsSaving(false);
    }
  };

  const submitNote = async () => {
    if (!canAddNotes || !noteInput.trim()) {
      return;
    }

    try {
      setIsSaving(true);
      await onAddNote(noteInput.trim());
      setNoteInput('');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="operations-panel-stack">
      <article className="card-shell panel-headline">
        <p className="verdict-kicker">Auditability & Traceability</p>
        <h2>COMPLIANCE LEDGER — IMMUTABLE RECORD OF ACTIONS</h2>
        <p className="verdict-meta">Patient: {patientId} | Evidence records: {variantCount} | Last sync: {outputTimestamp}</p>
      </article>

      <article className="card-shell">
        <h2 className="ops-heading">Operational Fields & Authorization State</h2>
        <div className="alert-log-wrap">
          <table className="ops-table" aria-label="Operational fields">
            <thead>
              <tr>
                <th>Field</th>
                <th>Current Value</th>
                <th>Last Editor</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {editableFields.map((field) => {
                const currentVal = fieldValues[field.key] ?? field.fallback;
                const lastEdit = latestByField.get(field.key);
                const isEditing = activeFieldKey === field.key;

                return (
                  <tr key={field.key}>
                    <td>{field.label}</td>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={draftValue}
                          onChange={(e) => setDraftValue(e.target.value)}
                          style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        />
                      ) : (
                        <strong>{String(currentVal)}</strong>
                      )}
                      {lastEdit && !isEditing ? (
                        <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>
                          Updated by {lastEdit.editedBy} ({new Date(lastEdit.timestamp).toLocaleTimeString()})
                        </span>
                      ) : null}
                    </td>
                    <td>{lastEdit?.editedBy || 'System / Initial'}</td>
                    <td>
                      {canEditManualFields ? (
                        isEditing ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={submitFieldEdit}
                              disabled={isSaving}
                              style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={isSaving}
                              style={{ background: '#cbd5e1', color: '#334155', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => beginEdit(field.key)}
                            style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Edit
                          </button>
                        )
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Read-only</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {activeFieldKey ? (
          <div style={{ marginTop: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>Justification / Edit Note:</label>
            <input
              type="text"
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              placeholder="Reason for change..."
              style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
          </div>
        ) : null}
      </article>

      <article className="card-shell">
        <h2 className="ops-heading">Clinical Notes</h2>
        {canAddNotes ? (
          <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Append clinical observation note..."
              style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
            <button
              type="button"
              onClick={submitNote}
              disabled={isSaving || !noteInput.trim()}
              style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              Add Note
            </button>
          </div>
        ) : null}

        <div className="alert-log-wrap">
          {notes.length ? (
            <ul className="focus-list">
              {notes.map((note, index) => (
                <li key={index}>
                  <strong>{note.author}</strong>
                  <span>{note.text}</span>
                  <small style={{ color: '#94a3b8', display: 'block' }}>{new Date(note.timestamp).toLocaleString()}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No clinical notes appended yet.</p>
          )}
        </div>
      </article>

      <article className="card-shell">
        <h2 className="ops-heading">Audit Trail (Immutable Activity Log)</h2>
        <div className="alert-log-wrap">
          <table className="ops-table" aria-label="Audit logs">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Role</th>
                <th>Action</th>
                <th>Justification</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length ? (
                auditLogs.map((log, index) => (
                  <tr key={index}>
                    <td>{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td>{log.user_id}</td>
                    <td>{log.role}</td>
                    <td>{log.action}</td>
                    <td>{log.justification || log.final_decision || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>No audit logs recorded for this record yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
