import { useEffect, useState } from 'react';

interface OllamaExplanation {
  summary?: string;
  explanation?: string;
  mechanism?: string;
  sourceReferences?: string[];
  uncertainties?: string[];
  limitations?: string[];
  disclaimer?: string;
}

export function GenomicsOllamaPanel(props: { gene?: string; drug?: string; phenotype?: string }) {
  const [status, setStatus] = useState<{ available?: boolean; model?: string; reason?: string } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [explaining, setExplaining] = useState(false);
  const [result, setResult] = useState<OllamaExplanation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch('/api/genomics/cyp2c19/ollama-status', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        setStatus(data);
        setLoadingStatus(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setStatus({ available: false, reason: err.message });
        setLoadingStatus(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleExplain = async () => {
    setExplaining(true);
    setError(null);
    try {
      const res = await fetch('/api/genomics/cyp2c19/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          gene: props.gene || 'CYP2C19',
          drug: props.drug || 'Clopidogrel',
          phenotype: props.phenotype || 'Intermediate Metabolizer (Research Placeholder)',
          sourceReferences: ['CPIC:CYP2C19-Clopidogrel-v1.2', 'PharmVar:CYP2C19-v6.2.21'],
          uncertainties: ['Research demonstration context; rule-based boundaries strictly preserved.'],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate explanation.');
      }

      setResult(data.explanation);
      setIsFallback(Boolean(data.fallback));
    } catch (err: any) {
      setError(err.message || 'Failed to connect to local Ollama service.');
    } finally {
      setExplaining(false);
    }
  };

  return (
    <article className="card-shell" style={{ marginTop: '20px', borderLeft: '4px solid #3b82f6' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 className="ops-heading" style={{ margin: 0 }}>Local AI Evidence Explanation (Ollama)</h2>
        <div>
          {loadingStatus ? (
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Checking Ollama...</span>
          ) : status?.available ? (
            <span style={{ fontSize: '0.8rem', background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '12px', fontWeight: 600 }}>
              Online · Model: {status.model || 'qwen3.5:4b'}
            </span>
          ) : (
            <span style={{ fontSize: '0.8rem', background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: '12px', fontWeight: 600 }}>
              Offline / Unavailable
            </span>
          )}
        </div>
      </div>

      <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '16px' }}>
        Provides local, source-grounded explanation of de-identified genomic evidence. Strictly adheres to clinical safety rules: AI explains evidence; rules make treatment decisions.
      </p>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
        <button
          type="button"
          onClick={handleExplain}
          disabled={explaining}
          style={{
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: explaining ? 'not-allowed' : 'pointer',
            opacity: explaining ? 0.7 : 1,
          }}
        >
          {explaining ? 'Synthesizing Explanation...' : 'Explain Evidence (Ollama)'}
        </button>
        {isFallback ? (
          <span style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 500 }}>
            ⚠️ Showing fallback template (Ollama offline).
          </span>
        ) : null}
      </div>

      {error ? (
        <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '10px 14px', borderRadius: '6px', fontSize: '0.9rem', marginBottom: '12px' }}>
          {error}
        </div>
      ) : null}

      {result ? (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '1rem', color: '#1e293b', marginBottom: '8px' }}>Synthesis Summary</h3>
          <p style={{ fontSize: '0.95rem', color: '#334155', marginBottom: '12px', lineHeight: 1.5 }}>
            {result.summary || result.explanation}
          </p>

          {result.mechanism ? (
            <div style={{ marginBottom: '10px' }}>
              <strong style={{ fontSize: '0.85rem', color: '#475569', display: 'block', marginBottom: '2px' }}>Mechanism / Basis:</strong>
              <span style={{ fontSize: '0.9rem', color: '#334155' }}>{result.mechanism}</span>
            </div>
          ) : null}

          {result.sourceReferences && result.sourceReferences.length > 0 ? (
            <div style={{ marginBottom: '10px' }}>
              <strong style={{ fontSize: '0.85rem', color: '#475569', display: 'block', marginBottom: '2px' }}>Source References:</strong>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', color: '#64748b' }}>
                {result.sourceReferences.map((ref, i) => (
                  <li key={i}>{ref}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
            {result.disclaimer || 'CLINICAL PGX RECOMMENDATION DISABLED — RESEARCH AND DEMO ONLY.'}
          </div>
        </div>
      ) : null}
    </article>
  );
}
