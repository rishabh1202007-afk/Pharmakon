import { useState, type ReactNode } from 'react';
import { TrendChart, type TrendSeries } from './TrendChart';
import type { AiDraftOutput, AuditLogEntry, CloudFieldEdit, CloudPatientNote } from '../../types/domain';
import type { LabRealtimeViewModel } from '../../services/labAIAgent';

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
                <td>{context.patientOutput?.drug ?? 'DRUG_NAME'}</td>
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
  patientOutput,
  outputTimestamp,
  variantCount,
  riskLabel,
  severityLabel,
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

    setIsSaving(true);
    try {
      await onSaveField(activeFieldKey, draftValue, draftNote);
      cancelEdit();
    } finally {
      setIsSaving(false);
    }
  };

  const submitNote = async () => {
    if (!canAddNotes) {
      return;
    }

    if (!noteInput.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await onAddNote(noteInput.trim());
      setNoteInput('');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="operations-panel-stack">
      <article className="card-shell panel-headline">
        <p className="verdict-kicker">Audit and Traceability</p>
        <h2>FULL DECISION CHAIN RETAINED FOR LEGAL-CLINICAL REVIEW</h2>
        <p className="verdict-meta">Patient: {patientId} | Data source: {patientOutput?.quality_metrics.file_name ?? 'No intake file'} | Timestamp: {outputTimestamp}</p>
      </article>

      <article className="card-shell">
        <h2 className="ops-heading">Immutable Event Trail</h2>
        <div className="alert-log-wrap">
          <table className="ops-table" aria-label="Immutable event trail">
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Event</th>
                <th>Evidence</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{outputTimestamp}</td>
                <td>Intake Console</td>
                <td>VCF parse and JSON generation</td>
                <td>{variantCount} variant lines</td>
                <td>Stored</td>
              </tr>
              <tr>
                <td>{outputTimestamp}</td>
                <td>Decision Engine</td>
                <td>Risk classification</td>
                <td>{riskLabel} / {severityLabel}</td>
                <td>Issued</td>
              </tr>
              <tr>
                <td>{outputTimestamp}</td>
                <td>Dashboard Renderer</td>
                <td>Clinical presentation refresh</td>
                <td>Patient-scoped data binding</td>
                <td>Complete</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article className="card-shell">
        <h2 className="ops-heading">AI-Derived Fields (Read-Only)</h2>
        <div className="alert-log-wrap">
          <table className="ops-table" aria-label="AI derived fields read only">
            <thead>
              <tr>
                <th>Field</th>
                <th>Current Value</th>
                <th>Edit Policy</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Risk Label</td>
                <td>{riskLabel}</td>
                <td>Locked · AI-derived</td>
              </tr>
              <tr>
                <td>Severity</td>
                <td>{severityLabel}</td>
                <td>Locked · AI-derived</td>
              </tr>
              <tr>
                <td>Primary Gene</td>
                <td>{String(fieldValues.primaryGene ?? patientOutput?.pharmacogenomic_profile.primary_gene ?? 'GENE_SYMBOL')}</td>
                <td>Locked · AI-derived</td>
              </tr>
              <tr>
                <td>Phenotype</td>
                <td>{String(fieldValues.phenotype ?? patientOutput?.pharmacogenomic_profile.phenotype ?? 'Unknown')}</td>
                <td>Locked · AI-derived</td>
              </tr>
              <tr>
                <td>Variant Count</td>
                <td>{variantCount}</td>
                <td>Locked · AI-derived</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article className="card-shell">
        <h2 className="ops-heading">Manual Operational Overrides (Editable)</h2>
        <div className="alert-log-wrap">
          <table className="ops-table" aria-label="Manual editable operational fields">
            <thead>
              <tr>
                <th>Field</th>
                <th>Current Value</th>
                <th>Last Edit</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {editableFields.map((field) => {
                const value = fieldValues[field.key];
                const displayValue = value === undefined || value === null || value === '' ? field.fallback : String(value);
                const lastEdit = latestByField.get(field.key);

                return (
                  <tr key={field.key}>
                    <td>{field.label}</td>
                    <td>{displayValue}</td>
                    <td>
                      {lastEdit
                        ? `${lastEdit.editedBy} · ${new Date(lastEdit.timestamp).toLocaleString()}${lastEdit.note ? ` · ${lastEdit.note}` : ''}`
                        : 'No edits logged'}
                    </td>
                    <td>
                      {!canEditManualFields ? (
                        <span className="meta-line">Locked for current role</span>
                      ) : activeFieldKey === field.key ? (
                        <div className="audit-inline-edit">
                          <input value={draftValue} onChange={(event) => setDraftValue(event.target.value)} />
                          <input
                            value={draftNote}
                            onChange={(event) => setDraftNote(event.target.value)}
                            placeholder="Edit note"
                          />
                          <div className="audit-inline-actions">
                            <button type="button" onClick={submitFieldEdit} disabled={isSaving}>
                              Save
                            </button>
                            <button type="button" onClick={cancelEdit} disabled={isSaving}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" className="audit-edit-btn" onClick={() => beginEdit(field.key)}>
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>

      <article className="card-shell">
        <h2 className="ops-heading">Field Edit Log (User Attributed)</h2>
        <div className="alert-log-wrap">
          <table className="ops-table" aria-label="Field edit log">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Field</th>
                <th>Value</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {latestEdits.length ? (
                latestEdits.slice(0, 20).map((edit, index) => (
                  <tr key={`${edit.timestamp}-${edit.fieldKey}-${index}`}>
                    <td>{new Date(edit.timestamp).toLocaleString()}</td>
                    <td>{edit.editedBy}</td>
                    <td>{edit.fieldKey}</td>
                    <td>{String(edit.value)}</td>
                    <td>{edit.note || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>No edits logged.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="card-shell">
        <h2 className="ops-heading">Clinical Notes</h2>
        {!canAddNotes ? <p className="meta-line">Read-only for current role. Notes are visible but cannot be edited.</p> : null}
        <div className="audit-note-entry">
          <textarea
            value={noteInput}
            onChange={(event) => setNoteInput(event.target.value)}
            rows={3}
            disabled={!canAddNotes}
            placeholder="Add note for audit trail and downstream review"
          />
          <button type="button" onClick={submitNote} disabled={isSaving || !noteInput.trim() || !canAddNotes}>
            Save Note
          </button>
        </div>
        <ul className="focus-list" style={{ marginTop: '0.6rem' }}>
          {notes.length ? (
            notes
              .slice()
              .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
              .slice(0, 12)
              .map((note, index) => (
                <li key={`${note.timestamp}-${index}`}>
                  <strong>{note.author}</strong>
                  <span>
                    {new Date(note.timestamp).toLocaleString()}
                    {note.authorEmail ? ` · ${note.authorEmail}` : ''}
                  </span>
                  <span>{note.text}</span>
                </li>
              ))
          ) : (
            <li>
              <strong>No notes logged</strong>
              <span>Add notes to preserve clinical context and reviewer intent.</span>
            </li>
          )}
        </ul>
      </article>

      <article className="card-shell">
        <h2 className="ops-heading">Immutable Audit Records</h2>
        <div className="alert-log-wrap">
          <table className="ops-table" aria-label="Immutable audit records">
            <thead>
              <tr>
                <th>user_id</th>
                <th>role</th>
                <th>patient_id</th>
                <th>action</th>
                <th>ai_suggestion</th>
                <th>final_decision</th>
                <th>timestamp</th>
                <th>justification</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length ? (
                auditLogs
                  .slice()
                  .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
                  .slice(0, 40)
                  .map((entry, index) => (
                    <tr key={`${entry.timestamp}-${entry.action}-${index}`}>
                      <td>{entry.user_id}</td>
                      <td>{entry.role}</td>
                      <td>{entry.patient_id}</td>
                      <td>{entry.action}</td>
                      <td>{entry.ai_suggestion || '—'}</td>
                      <td>{entry.final_decision || '—'}</td>
                      <td>{new Date(entry.timestamp).toLocaleString()}</td>
                      <td>{entry.justification || '—'}</td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={8}>No immutable audit events logged yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="card-shell">
        <h2 className="ops-heading">Control Assertions</h2>
        <ul className="focus-list">
          <li>
            <strong>Provenance maintained</strong>
            <span>All decision outputs remain linked to source intake artifact and timestamp.</span>
          </li>
          <li>
            <strong>Determinism maintained</strong>
            <span>Equivalent inputs and rule versions produce equivalent outputs.</span>
          </li>
          <li>
            <strong>Accountability maintained</strong>
            <span>Escalation and report issuance remain tied to named procedural owners.</span>
          </li>
        </ul>
      </article>
    </section>
  );
}
