import { useEffect, useMemo, useRef, useState } from 'react';

interface PrescriptionSavePayload {
  diagnosis: string;
  medication: string;
  dosage: string;
  instructions: string;
  aiSuggestion: string;
  finalDecision: string;
  justification: string;
}

interface PrescriptionEditorPanelProps {
  patientId: string;
  clinicianName: string;
  riskLevel: string;
  aiRecommendation: string;
  aiRationale: string;
  saferAlternatives: string;
  canEdit: boolean;
  isSaving: boolean;
  onSave: (payload: PrescriptionSavePayload) => Promise<void>;
}

interface LabReportSavePayload {
  title: string;
  sourceType: 'pdf' | 'structured';
  findings: string;
  values: Array<{ name: string; value: string; reference: string }>;
}

interface LabReportEditorPanelProps {
  canEdit: boolean;
  isSaving: boolean;
  onSave: (payload: LabReportSavePayload) => Promise<void>;
  onAttachPdf: (file: File, payload: LabReportSavePayload) => Promise<void>;
}

export interface PdfViewerDocument {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  owner: string;
  source?: 'generated' | 'uploaded';
  reportKind?: 'prescription' | 'lab_report' | 'uploaded_lab';
  linkedReportId?: string;
}

interface PdfViewerPanelProps {
  documents: PdfViewerDocument[];
  activeDocumentId: string | null;
  onSelectDocument: (documentId: string) => void;
}

function parseStructuredValueRows(input: string): Array<{ name: string; value: string; reference: string }> {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, value, reference] = line.split('|').map((entry) => entry.trim());
      return {
        name: name || 'Marker',
        value: value || 'N/A',
        reference: reference || 'N/A',
      };
    });
}

function isAbnormal(value: string, reference: string): boolean {
  const numericValue = Number(value.replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(numericValue)) {
    return false;
  }

  const rangeMatch = reference.match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/);
  if (!rangeMatch) {
    return false;
  }

  const lower = Number(rangeMatch[1]);
  const upper = Number(rangeMatch[2]);
  if (!Number.isFinite(lower) || !Number.isFinite(upper)) {
    return false;
  }

  return numericValue < lower || numericValue > upper;
}

export function PrescriptionEditorPanel({
  patientId,
  clinicianName,
  riskLevel,
  aiRecommendation,
  aiRationale,
  saferAlternatives,
  canEdit,
  isSaving,
  onSave,
}: PrescriptionEditorPanelProps) {
  const [diagnosis, setDiagnosis] = useState('Pharmacogenomic risk requiring dose optimization');
  const [medication, setMedication] = useState('');
  const [dosage, setDosage] = useState('');
  const [instructions, setInstructions] = useState('');
  const [finalDecision, setFinalDecision] = useState(aiRecommendation);
  const [justification, setJustification] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    if (!canEdit) {
      setMessage('Read-only for this role. Doctor authority is required to finalize prescriptions.');
      return;
    }

    if (!diagnosis.trim() || !medication.trim() || !dosage.trim() || !instructions.trim() || !finalDecision.trim()) {
      setMessage('Complete all prescription template fields before saving.');
      return;
    }

    try {
      await onSave({
        diagnosis: diagnosis.trim(),
        medication: medication.trim(),
        dosage: dosage.trim(),
        instructions: instructions.trim(),
        aiSuggestion: aiRecommendation,
        finalDecision: finalDecision.trim(),
        justification: justification.trim() || 'Clinician final decision recorded.',
      });

      setMessage('Prescription saved with immutable decision trace.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save prescription right now.');
    }
  };

  return (
    <section className="operations-panel-stack">
      <article className="card-shell panel-headline">
        <p className="verdict-kicker">Prescription Editor (Doctor Authority)</p>
        <h2>PATIENT {patientId} · TEMPLATE-BASED PRESCRIBING WITH LIVE AI VALIDATION</h2>
        <p className="verdict-meta">Clinician: {clinicianName} · Risk Class: {riskLevel}</p>
      </article>

      <section className="role-editor-grid">
        <article className="card-shell role-editor-card">
          <h3>Prescription Template</h3>
          <label>
            <span>Diagnosis</span>
            <input value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} disabled={!canEdit || isSaving} />
          </label>
          <label>
            <span>Medication</span>
            <input value={medication} onChange={(event) => setMedication(event.target.value)} disabled={!canEdit || isSaving} />
          </label>
          <label>
            <span>Dosage</span>
            <input value={dosage} onChange={(event) => setDosage(event.target.value)} disabled={!canEdit || isSaving} />
          </label>
          <label>
            <span>Instructions</span>
            <textarea
              rows={3}
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              disabled={!canEdit || isSaving}
            />
          </label>
          <label>
            <span>Final decision (clinician authority)</span>
            <textarea
              rows={2}
              value={finalDecision}
              onChange={(event) => setFinalDecision(event.target.value)}
              disabled={!canEdit || isSaving}
            />
          </label>
          <label>
            <span>Justification</span>
            <textarea
              rows={2}
              value={justification}
              onChange={(event) => setJustification(event.target.value)}
              disabled={!canEdit || isSaving}
              placeholder="Required when overriding AI suggestion"
            />
          </label>
          <button type="button" className="audit-edit-btn" onClick={save} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Prescription + Audit'}
          </button>
          {message ? <small className="topbar-search-status">{message}</small> : null}
        </article>

        <article className="card-shell role-editor-card role-editor-card--info">
          <h3>AI Validation Panel (Non-authoritative)</h3>
          <ul className="focus-list">
            <li>
              <strong>Risk classification</strong>
              <span>{riskLevel}</span>
            </li>
            <li>
              <strong>Suggested action</strong>
              <span>{aiRecommendation}</span>
            </li>
            <li>
              <strong>Rationale</strong>
              <span>{aiRationale}</span>
            </li>
            <li>
              <strong>Safer alternatives</strong>
              <span>{saferAlternatives}</span>
            </li>
          </ul>
          <p className="meta-line">AI suggests, clinician decides. Overrides are immutably logged with justification.</p>
        </article>
      </section>
    </section>
  );
}

export function LabReportEditorPanel({ canEdit, isSaving, onSave, onAttachPdf }: LabReportEditorPanelProps) {
  const [title, setTitle] = useState('Lab Report');
  const [sourceType, setSourceType] = useState<'pdf' | 'structured'>('structured');
  const [findings, setFindings] = useState('');
  const [structuredRows, setStructuredRows] = useState('Hemoglobin|11.2|12.0-15.0\nWBC|13.8|4.0-11.0');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const parsedRows = useMemo(() => parseStructuredValueRows(structuredRows), [structuredRows]);

  const autoSummary = useMemo(() => {
    const abnormal = parsedRows.filter((row) => isAbnormal(row.value, row.reference));
    if (!abnormal.length) {
      return 'No abnormal numeric values detected from structured report rows. Clinical observations only; no treatment recommendation.';
    }

    return `Abnormal findings: ${abnormal
      .map((row) => `${row.name}=${row.value} (ref ${row.reference})`)
      .join('; ')}. Clinical observations only; no treatment recommendation.`;
  }, [parsedRows]);

  const save = async () => {
    if (!canEdit) {
      setMessage('Read-only for this role. Lab report authoring is restricted to lab technicians.');
      return;
    }

    if (!title.trim() || !findings.trim()) {
      setMessage('Provide report title and findings before saving.');
      return;
    }

    if (sourceType === 'pdf' && !pdfFile) {
      setMessage('Attach a PDF file before saving as PDF source type.');
      return;
    }

    try {
      await onSave({
        title: title.trim(),
        sourceType,
        findings: findings.trim(),
        values: parsedRows,
      });

      setMessage('Lab report saved with AI summary and audit trace.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save lab report right now.');
    }
  };

  const attachPdf = async () => {
    if (!canEdit) {
      setMessage('Read-only for this role. Lab report authoring is restricted to lab technicians.');
      return;
    }

    if (!pdfFile) {
      setMessage('Choose a PDF file before attaching.');
      return;
    }

    if (!pdfFile.name.toLowerCase().endsWith('.pdf')) {
      setMessage('Only PDF files are supported.');
      return;
    }

    try {
      await onAttachPdf(pdfFile, {
        title: title.trim() || pdfFile.name,
        sourceType: 'pdf',
        findings: findings.trim() || 'PDF-based report uploaded for review.',
        values: parsedRows,
      });
      setMessage(`PDF attached: ${pdfFile.name}. It is now available in the Reports tab.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to attach PDF right now.');
    }
  };

  return (
    <section className="operations-panel-stack">
      <article className="card-shell panel-headline">
        <p className="verdict-kicker">Lab Report Editor</p>
        <h2>STRUCTURED LAB REPORT BUILDER WITH AUTO-SUMMARY</h2>
        <p className="verdict-meta">Clinical observations only · no treatment recommendations emitted.</p>
      </article>

      <section className="role-editor-grid">
        <article className="card-shell role-editor-card">
          <h3>Lab Report Template</h3>
          <label>
            <span>Report title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} disabled={!canEdit || isSaving} />
          </label>
          <label>
            <span>Source type</span>
            <select value={sourceType} onChange={(event) => setSourceType(event.target.value as 'pdf' | 'structured')} disabled={!canEdit || isSaving}>
              <option value="structured">Structured Editor</option>
              <option value="pdf">PDF Upload Metadata</option>
            </select>
          </label>
          <label>
            <span>Upload PDF report</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => {
                const selected = event.target.files?.[0] ?? null;
                setPdfFile(selected);
                if (selected) {
                  setSourceType('pdf');
                }
              }}
              disabled={!canEdit || isSaving}
            />
          </label>
          <label>
            <span>Clinical findings</span>
            <textarea
              rows={3}
              value={findings}
              onChange={(event) => setFindings(event.target.value)}
              disabled={!canEdit || isSaving}
              placeholder="Summarize observations, specimen context, and validated results"
            />
          </label>
          <label>
            <span>Structured values (name|value|reference per line)</span>
            <textarea
              rows={4}
              value={structuredRows}
              onChange={(event) => setStructuredRows(event.target.value)}
              disabled={!canEdit || isSaving}
            />
          </label>
          <button type="button" className="audit-edit-btn" onClick={attachPdf} disabled={isSaving || !pdfFile}>
            {isSaving ? 'Processing...' : pdfFile ? `Attach ${pdfFile.name} to Reports` : 'Attach PDF to Reports'}
          </button>
          <button type="button" className="audit-edit-btn" onClick={save} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Lab Report'}
          </button>
          {message ? <small className="topbar-search-status">{message}</small> : null}
        </article>

        <article className="card-shell role-editor-card role-editor-card--info">
          <h3>Auto-summary (AI observation mode)</h3>
          <p className="meta-line">{autoSummary}</p>
          <div className="alert-log-wrap">
            <table className="ops-table" aria-label="Lab structured values">
              <thead>
                <tr>
                  <th>Marker</th>
                  <th>Value</th>
                  <th>Reference</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((row, index) => {
                  const abnormal = isAbnormal(row.value, row.reference);
                  return (
                    <tr key={`${row.name}-${index}`}>
                      <td>{row.name}</td>
                      <td>{row.value}</td>
                      <td>{row.reference}</td>
                      <td>{abnormal ? 'Abnormal' : 'Within range'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </section>
  );
}

export function PdfViewerPanel({ documents, activeDocumentId, onSelectDocument }: PdfViewerPanelProps) {
  const activeDocument = documents.find((entry) => entry.id === activeDocumentId) ?? documents[0] ?? null;
  const viewerFrameRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === viewerFrameRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    if (!viewerFrameRef.current || !activeDocument) {
      return;
    }

    try {
      if (document.fullscreenElement === viewerFrameRef.current) {
        await document.exitFullscreen();
      } else {
        await viewerFrameRef.current.requestFullscreen();
      }
    } catch {
      // Browser denied full-screen request; keep normal viewer.
    }
  };

  return (
    <section className="operations-panel-stack">
      <article className="card-shell panel-headline">
        <p className="verdict-kicker">PDF Viewer</p>
        <h2>PATIENT REPORT PDF ACCESS (READ-ONLY)</h2>
        <p className="verdict-meta">All roles can review generated clinical documents and summaries.</p>
      </article>

      <section className="role-editor-grid role-editor-grid--pdf">
        <article className="card-shell role-editor-card role-editor-card--list">
          <h3>Available PDFs</h3>
          {documents.length ? (
            <ul className="audit-list">
              {documents.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className="audit-edit-btn"
                    onClick={() => onSelectDocument(entry.id)}
                    style={{ width: '100%', textAlign: 'left' }}
                  >
                    {entry.title}
                  </button>
                  <small>
                    {new Date(entry.createdAt).toLocaleString()} · {entry.owner}
                    {entry.source ? ` · ${entry.source === 'uploaded' ? 'Uploaded PDF' : 'Generated PDF'}` : ''}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="meta-line">No PDF documents generated yet.</p>
          )}
        </article>

        <article className="card-shell role-editor-card role-editor-card--viewer">
          <div className="report-viewer-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem' }}>
            <h3>Viewer</h3>
            <button type="button" className="audit-edit-btn" onClick={toggleFullscreen} disabled={!activeDocument}>
              {isFullscreen ? 'Exit Full Screen' : 'View Full Screen'}
            </button>
          </div>
          {activeDocument ? (
            <div ref={viewerFrameRef}>
              <iframe src={activeDocument.url} title={activeDocument.title} className="pdf-viewer-frame" />
            </div>
          ) : (
            <p className="meta-line">Select a generated PDF to preview.</p>
          )}
        </article>
      </section>
    </section>
  );
}
