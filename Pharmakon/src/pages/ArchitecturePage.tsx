import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card } from '../ui/Card';

const architectureFlow = [
  {
    icon: '🏥',
    title: 'Hospital Management System',
    bullets: [
      { label: 'Patient Registration', note: 'Captures verified patient identity, admission context, and care ownership.' },
      { label: 'Electronic Health Records (EHR)', note: 'Maintains longitudinal diagnoses, allergies, medications, and prior interventions.' },
      { label: 'Doctor/Nurse Dashboard', note: 'Provides live status, urgent actions, and care priorities at a glance.' },
      { label: 'Prescription System', note: 'Supports medication ordering with validation and dosage context checks.' },
      { label: 'Lab Reports (Vitals + Genomics VCF)', note: 'Combines bedside measurements with variant evidence for precision decisions.' },
      { label: 'Audit Logs (who changed what, when)', note: 'Tracks all user edits for accountability, traceability, and compliance.' },
    ],
    explanation: 'Core clinical operations are captured here with accountable edits and traceable records.',
  },
  {
    icon: '🔗',
    title: 'Data Integration Layer',
    bullets: [
      { label: 'Clinical data (vitals time-series)', note: 'Streams temporal physiological signals used for trend-aware risk analysis.' },
      { label: 'Genomic data (VCF upload)', note: 'Ingests and validates variant files for deterministic interpretation.' },
      { label: 'Prescription data', note: 'Normalizes current therapy context for interaction and safety checks.' },
      { label: 'Historical patient records', note: 'Adds baseline behavior and prior outcomes to improve context.' },
    ],
    explanation: 'Signals from clinical care and genomics are unified into one analysis-ready stream.',
  },
  {
    icon: '⚙️',
    title: 'Feature Engineering & Normalization',
    bullets: [
      { label: 'Temporal trends (HR, SpO2, WBC)', note: 'Builds sequence features that preserve clinical progression over time.' },
      { label: 'Derived features (ratios, deltas)', note: 'Computes transformed indicators that expose hidden instability patterns.' },
      { label: 'Variant extraction (CYP genes, etc.)', note: 'Selects pharmacogenomic loci relevant to metabolism and response.' },
      { label: 'Drug encoding', note: 'Converts medication context to model-ready structured representations.' },
    ],
    explanation: 'Raw inputs are standardized and transformed into model features with consistent clinical meaning.',
  },
  {
    icon: '🧠',
    title: 'Multi-Modal AI Engine',
    bullets: [
      {
        label: 'Clinical intelligence: LSTM + Attention, GRU + Attention, XGBoost snapshot risk',
        note: 'Blends temporal deep learning and tabular modeling for robust clinical risk scoring.',
      },
      {
        label: 'Genomic intelligence: VCF to phenotype (CYP2D6, CYP2C19), drug metabolism prediction',
        note: 'Maps genotype evidence to metabolism phenotype and expected drug handling profile.',
      },
      {
        label: 'Drug intelligence: drug-genotype interaction and contraindication detection',
        note: 'Detects therapy conflicts, contraindications, and genotype-sensitive safety issues.',
      },
    ],
    explanation: 'Specialized model paths evaluate physiological patterns, pharmacogenomics, and medication safety jointly.',
  },
  {
    icon: '🧩',
    title: 'Fusion / Decision Engine',
    bullets: [
      { label: 'Combines clinical risk', note: 'Aggregates instability signals from temporal and snapshot clinical inputs.' },
      { label: 'Combines genetic risk', note: 'Adds phenotype-driven metabolism constraints into final scoring.' },
      { label: 'Combines drug interaction risk', note: 'Incorporates medication conflict severity into unified decision logic.' },
      { label: 'Generates final personalized decision', note: 'Produces one patient-specific recommendation with confidence context.' },
    ],
    explanation: 'The fusion layer aggregates all risk channels into a single interpretable clinical recommendation.',
  },
  {
    icon: '🔍',
    title: 'Explainability & Trust Layer',
    bullets: [
      { label: 'SHAP feature reasoning', note: 'Shows which variables most influenced the model output direction.' },
      { label: 'Attention-based time reasoning', note: 'Highlights critical moments across the patient timeline.' },
      { label: 'Genomic explanation', note: 'Links key variants to phenotype interpretation and treatment impact.' },
    ],
    explanation: 'Each prediction is accompanied by model rationale and variant-level evidence for clinician confidence.',
  },
  {
    icon: '🚨',
    title: 'Clinical Decision Output',
    bullets: [
      { label: 'Risk score', note: 'Summarizes current patient risk to support rapid prioritization.' },
      { label: 'Alerts', note: 'Raises immediate notifications when thresholds or rules trigger.' },
      { label: 'Drug warnings', note: 'Flags unsafe medication patterns and genotype-sensitive risks.' },
      { label: 'Alternative recommendations', note: 'Suggests safer therapeutic options when needed.' },
    ],
    explanation: 'Actionable outputs are surfaced directly for bedside decisions and medication planning.',
  },
  {
    icon: '🔁',
    title: 'HMS Feedback Loop (Very Important)',
    bullets: [
      { label: 'Updated prescription stored', note: 'Writes finalized decisions back into the hospital record system.' },
      { label: 'Doctor actions logged', note: 'Captures clinician actions for governance and replayable audit trails.' },
      { label: 'Patient outcome tracking', note: 'Monitors post-decision response to measure real-world impact.' },
      { label: 'Continuous learning data', note: 'Builds validated evidence for future tuning and improvement.' },
    ],
    explanation: 'Outcomes and interventions flow back to strengthen monitoring quality and future decision support.',
  },
] as const;

function getTopicIcon(label: string, fallback: string) {
  const text = label.toLowerCase();

  if (text.includes('registration')) return '🪪';
  if (text.includes('electronic health records') || text.includes('ehr')) return '📋';
  if (text.includes('dashboard')) return '🖥️';
  if (text.includes('prescription')) return '💊';
  if (text.includes('lab reports')) return '🧪';
  if (text.includes('audit')) return '🧾';
  if (text.includes('clinical data') || text.includes('vitals')) return '🩺';
  if (text.includes('genomic') || text.includes('vcf') || text.includes('variant')) return '🧬';
  if (text.includes('historical')) return '🗂️';
  if (text.includes('temporal')) return '⏱️';
  if (text.includes('derived features') || text.includes('ratios') || text.includes('deltas')) return '📐';
  if (text.includes('drug encoding') || text.includes('drug intelligence') || text.includes('drug interaction')) return '💉';
  if (text.includes('clinical intelligence')) return '🧠';
  if (text.includes('genomic intelligence')) return '🧬';
  if (text.includes('combines clinical risk')) return '📈';
  if (text.includes('combines genetic risk')) return '🧬';
  if (text.includes('combines drug interaction risk')) return '⚠️';
  if (text.includes('personalized decision')) return '✅';
  if (text.includes('shap')) return '🔍';
  if (text.includes('attention-based')) return '🕒';
  if (text.includes('genomic explanation')) return '📖';
  if (text.includes('risk score')) return '📊';
  if (text.includes('alerts')) return '🚨';
  if (text.includes('drug warnings')) return '⚠️';
  if (text.includes('alternative recommendations')) return '🧭';
  if (text.includes('updated prescription')) return '💾';
  if (text.includes('doctor actions')) return '🧑‍⚕️';
  if (text.includes('outcome')) return '📉';
  if (text.includes('learning')) return '📚';

  return fallback;
}

export function ArchitecturePage() {
  const [activeLayerIndex, setActiveLayerIndex] = useState<number | null>(null);
  const [isGuidedPlaying, setIsGuidedPlaying] = useState(false);
  const [isGuidedPaused, setIsGuidedPaused] = useState(false);
  const [guidedLayerIndex, setGuidedLayerIndex] = useState(0);
  const [selectedBulletIndex, setSelectedBulletIndex] = useState<number | null>(null);
  const [hoveredBulletIndex, setHoveredBulletIndex] = useState<number | null>(null);
  const [guidedPhase, setGuidedPhase] = useState<'enter' | 'exit'>('enter');

  const STEP_DURATION_MS = 1900;
  const TRANSITION_DURATION_MS = 780;

  const activeLayer = activeLayerIndex === null ? null : architectureFlow[activeLayerIndex];
  const guidedLayer = architectureFlow[guidedLayerIndex];
  const activeDetailBulletIndex = hoveredBulletIndex ?? selectedBulletIndex;
  const safeActiveDetailBulletIndex =
    activeDetailBulletIndex === null ? null : Math.min(activeDetailBulletIndex, guidedLayer.bullets.length - 1);
  const activeDetailBullet = safeActiveDetailBulletIndex === null ? null : guidedLayer.bullets[safeActiveDetailBulletIndex];
  const isSecondHalfBullet =
    safeActiveDetailBulletIndex !== null && safeActiveDetailBulletIndex >= Math.ceil(guidedLayer.bullets.length / 2);
  const guidedBulletRingNodes = guidedLayer.bullets.map((_, index) => {
    const angle = -90 + (index * 360) / guidedLayer.bullets.length;
    const radians = (angle * Math.PI) / 180;
    const radius = 42;
    return {
      x: 50 + radius * Math.cos(radians),
      y: 50 + radius * Math.sin(radians),
    };
  });
  const selectedBulletPoint =
    safeActiveDetailBulletIndex === null ? { x: 50, y: 50 } : guidedBulletRingNodes[safeActiveDetailBulletIndex] ?? { x: 50, y: 50 };
  const isDetailOnRight = selectedBulletPoint.x >= 50;
  const isDetailAbove = isSecondHalfBullet || selectedBulletPoint.y >= 62;
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const selectedBulletContentAnchor = {
    x: clamp(selectedBulletPoint.x + (isDetailOnRight ? 18 : -18), 16, 84),
    y: clamp(isDetailAbove ? selectedBulletPoint.y - 3 : selectedBulletPoint.y, 20, 88),
  };

  useEffect(() => {
    if (!isGuidedPlaying || isGuidedPaused) {
      return;
    }

    const holdTimer = window.setTimeout(() => {
      setGuidedPhase('exit');
    }, STEP_DURATION_MS);

    const nextTimer = window.setTimeout(() => {
      const hasNext = guidedLayerIndex < architectureFlow.length - 1;
      if (hasNext) {
        setGuidedLayerIndex((prev) => prev + 1);
        setGuidedPhase('enter');
        return;
      }

      setIsGuidedPlaying(false);
      setIsGuidedPaused(false);
      setGuidedPhase('enter');
    }, STEP_DURATION_MS + TRANSITION_DURATION_MS);

    return () => {
      window.clearTimeout(holdTimer);
      window.clearTimeout(nextTimer);
    };
  }, [guidedLayerIndex, isGuidedPaused, isGuidedPlaying]);

  useEffect(() => {
    setSelectedBulletIndex(null);
    setHoveredBulletIndex(null);
  }, [guidedLayerIndex]);

  const handleStartGuidedWalkthrough = () => {
    setActiveLayerIndex(null);
    setGuidedLayerIndex(0);
    setSelectedBulletIndex(null);
    setHoveredBulletIndex(null);
    setGuidedPhase('enter');
    setIsGuidedPaused(false);
    setIsGuidedPlaying(true);
  };

  const handlePauseResume = () => {
    if (!isGuidedPlaying) {
      return;
    }
    setIsGuidedPaused((prev) => !prev);
  };

  const handleReplay = () => {
    setActiveLayerIndex(null);
    setGuidedLayerIndex(0);
    setSelectedBulletIndex(null);
    setHoveredBulletIndex(null);
    setGuidedPhase('enter');
    setIsGuidedPaused(false);
    setIsGuidedPlaying(true);
  };

  const handleSkip = () => {
    if (guidedLayerIndex >= architectureFlow.length - 1) {
      setIsGuidedPlaying(false);
      setIsGuidedPaused(false);
      setGuidedPhase('enter');
      return;
    }
    setGuidedPhase('enter');
    setGuidedLayerIndex((prev) => prev + 1);
  };

  const isGuidedModeActive = isGuidedPlaying || isGuidedPaused;

  return (
    <main className="page architecture-page">
      <header className="sub-header fade-in">
        <div>
          <h1>Architecture Snapshot</h1>
          <p>Transparent, deterministic logic driving every pharmacogenomic verdict.</p>
        </div>
        <Link to="/">Back to home</Link>
      </header>

      <Card>
        {activeLayer ? (
          <div
            key={`detail-${activeLayer.title}`}
            className="architecture-flowchart architecture-flowchart--detail"
            aria-label="Expanded architecture flowchart view"
          >
            <button type="button" className="architecture-flowchart__back" onClick={() => setActiveLayerIndex(null)}>
              Back to all headings
            </button>

            <article className="architecture-flowchart__node architecture-flowchart__node--active">
              <span className="architecture-map__icon" aria-hidden="true">
                {activeLayer.icon}
              </span>
              <span>{activeLayer.title}</span>
            </article>

            <div className="architecture-flowchart__connector" aria-hidden="true" />

            <ol className="architecture-flowchart__detail-list">
              {activeLayer.bullets.map((bullet, bulletIndex) => (
                <li
                  key={bullet.label}
                  className="architecture-flowchart__detail-item architecture-flowchart__detail-item--enter"
                  style={{ animationDelay: `${bulletIndex * 80}ms` }}
                >
                  <span className="architecture-flowchart__detail-index">{bulletIndex + 1}</span>
                  <div className="architecture-flowchart__detail-copy">
                    <strong>
                      <span className="architecture-flowchart__bullet-icon" aria-hidden="true">
                        {getTopicIcon(bullet.label, activeLayer.icon)}
                      </span>
                      <span>{bullet.label}</span>
                    </strong>
                    <p>{bullet.note}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="architecture-flowchart__connector architecture-flowchart__connector--wide" aria-hidden="true" />

            <article className="architecture-flowchart__explanation">
              <h4>Layer Explanation</h4>
              <p>{activeLayer.explanation}</p>
            </article>
          </div>
        ) : (
          <div className="architecture-map" aria-label="Main architecture flowchart">
            <article className="architecture-map__title">Architecture Flow</article>

            <div className="architecture-guide-controls" role="group" aria-label="Guided walkthrough controls">
              <button type="button" className="architecture-guide-controls__btn" onClick={handleStartGuidedWalkthrough}>
                Explain How It Works
              </button>
              {isGuidedModeActive ? (
                <>
                  <button type="button" className="architecture-guide-controls__btn" onClick={handlePauseResume}>
                    {isGuidedPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button type="button" className="architecture-guide-controls__btn" onClick={handleReplay}>
                    Replay
                  </button>
                  <button type="button" className="architecture-guide-controls__btn" onClick={handleSkip}>
                    Skip
                  </button>
                </>
              ) : null}
            </div>

            <div className={`architecture-map__rows ${isGuidedModeActive ? 'architecture-map__rows--guided-hidden' : ''}`}>
              <div className="architecture-map__row">
                {architectureFlow.slice(0, 4).map((layer, index) => (
                  <div
                    key={layer.title}
                    className={`architecture-map__node-wrap architecture-map__row-item ${
                      isGuidedModeActive
                        ? index === guidedLayerIndex
                          ? 'architecture-map__node-wrap--guided-active architecture-map__node-wrap--guided-center'
                          : 'architecture-map__node-wrap--guided-hidden'
                        : ''
                    }`}
                    style={{ animationDelay: `${index * 70}ms` }}
                  >
                    <button
                      type="button"
                      className={`architecture-map__node ${
                        isGuidedModeActive
                          ? index === guidedLayerIndex
                            ? 'architecture-map__node--guided-active'
                            : 'architecture-map__node--guided-dim'
                          : ''
                      }`}
                      onClick={() => {
                        setIsGuidedPlaying(false);
                        setIsGuidedPaused(false);
                        setActiveLayerIndex(index);
                      }}
                      aria-label={`Open ${layer.title} details`}
                    >
                      <span className="architecture-map__icon" aria-hidden="true">
                        {layer.icon}
                      </span>
                      <span>{layer.title}</span>
                    </button>
                    {index < 3 ? <span className="architecture-map__arrow" aria-hidden="true">→</span> : null}
                  </div>
                ))}
              </div>

              <div className="architecture-map__row-connector" aria-hidden="true">
                <span>↓</span>
              </div>

              <div className="architecture-map__row">
                {[...architectureFlow.slice(4)].reverse().map((layer, localIndex) => {
                  const index = architectureFlow.findIndex((item) => item.title === layer.title);
                  return (
                    <div
                      key={layer.title}
                      className={`architecture-map__node-wrap architecture-map__row-item ${
                        isGuidedModeActive
                          ? index === guidedLayerIndex
                            ? 'architecture-map__node-wrap--guided-active architecture-map__node-wrap--guided-center'
                            : 'architecture-map__node-wrap--guided-hidden'
                          : ''
                      }`}
                      style={{ animationDelay: `${index * 70}ms` }}
                    >
                      <button
                        type="button"
                        className={`architecture-map__node ${
                          isGuidedModeActive
                            ? index === guidedLayerIndex
                              ? 'architecture-map__node--guided-active'
                              : 'architecture-map__node--guided-dim'
                            : ''
                        }`}
                        onClick={() => {
                          setIsGuidedPlaying(false);
                          setIsGuidedPaused(false);
                          setActiveLayerIndex(index);
                        }}
                        aria-label={`Open ${layer.title} details`}
                      >
                        <span className="architecture-map__icon" aria-hidden="true">
                          {layer.icon}
                        </span>
                        <span>{layer.title}</span>
                      </button>
                      {localIndex < 3 ? <span className="architecture-map__arrow" aria-hidden="true">←</span> : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {isGuidedModeActive ? (
              <section
                key={`guided-step-${guidedLayer.title}`}
                className={`architecture-guide-panel ${
                  guidedPhase === 'exit' ? 'architecture-guide-panel--phase-exit' : 'architecture-guide-panel--phase-enter'
                }`}
                aria-live="polite"
              >
                <div className="architecture-guide-ring">
                  <svg className="architecture-guide-ring__branches" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                      <marker
                        id="architecture-guide-arrow"
                        viewBox="0 0 10 10"
                        refX="8"
                        refY="5"
                        markerWidth="4"
                        markerHeight="4"
                        orient="auto-start-reverse"
                      >
                        <path d="M 0 0 L 10 5 L 0 10 z" />
                      </marker>
                    </defs>
                    {guidedBulletRingNodes.map((point, branchIndex) => (
                      <line
                        key={`branch-${guidedLayer.title}-${guidedLayer.bullets[branchIndex].label}`}
                        x1="50"
                        y1="50"
                        x2={point.x.toFixed(2)}
                        y2={point.y.toFixed(2)}
                        style={{ transitionDelay: `${branchIndex * 120}ms` }}
                      />
                    ))}
                  </svg>

                  <div className="architecture-guide-panel__header architecture-guide-panel__center-heading">
                    <span className="architecture-map__icon" aria-hidden="true">
                      {guidedLayer.icon}
                    </span>
                    <h4>{guidedLayer.title}</h4>
                  </div>

                  {activeDetailBullet ? (
                    <div
                      className={`architecture-guide-panel__content-box architecture-guide-panel__content-box--inside ${
                        isDetailOnRight
                          ? 'architecture-guide-panel__content-box--inside-right'
                          : 'architecture-guide-panel__content-box--inside-left'
                      } ${
                        isDetailAbove
                          ? 'architecture-guide-panel__content-box--inside-above'
                          : 'architecture-guide-panel__content-box--inside-middle'
                      }`}
                      style={{
                        left: `${selectedBulletContentAnchor.x}%`,
                        top: `${selectedBulletContentAnchor.y}%`,
                      }}
                    >
                      <h5 className="architecture-guide-panel__subheading">
                        <span className="architecture-guide-panel__inline-icon" aria-hidden="true">
                          {getTopicIcon(activeDetailBullet.label, guidedLayer.icon)}
                        </span>
                        <span>{activeDetailBullet.label}</span>
                      </h5>
                      <p className="architecture-guide-panel__explanation">
                        <span className="architecture-guide-panel__inline-icon" aria-hidden="true">
                          i
                        </span>
                        <span>{guidedLayer.explanation}</span>
                      </p>

                      <article key={`${guidedLayer.title}-${activeDetailBullet.label}`} className="architecture-guide-panel__selected-detail">
                        <span className="architecture-flowchart__detail-index">{safeActiveDetailBulletIndex! + 1}</span>
                        <p>
                          <span className="architecture-guide-panel__inline-icon" aria-hidden="true">
                            {getTopicIcon(activeDetailBullet.label, guidedLayer.icon)}
                          </span>
                          <span>{activeDetailBullet.note}</span>
                        </p>
                      </article>
                    </div>
                  ) : null}

                  {guidedLayer.bullets.map((bullet, bulletIndex) => {
                    return (
                      <button
                        key={bullet.label}
                        type="button"
                        className={`architecture-guide-ring__node architecture-guide-ring__node--bullet ${
                          safeActiveDetailBulletIndex === bulletIndex ? 'architecture-guide-ring__node--selected' : ''
                        }`}
                        style={{
                          left: `${guidedBulletRingNodes[bulletIndex].x}%`,
                          top: `${guidedBulletRingNodes[bulletIndex].y}%`,
                          transitionDelay: `${bulletIndex * 120}ms`,
                        }}
                        onMouseEnter={() => setHoveredBulletIndex(bulletIndex)}
                        onMouseLeave={() => setHoveredBulletIndex(null)}
                        onFocus={() => setHoveredBulletIndex(bulletIndex)}
                        onBlur={() => setHoveredBulletIndex(null)}
                        onClick={() => setSelectedBulletIndex(bulletIndex)}
                        aria-pressed={selectedBulletIndex === bulletIndex}
                        aria-label={`${bulletIndex + 1}. ${bullet.label}`}
                      >
                        <span
                          className={`architecture-flowchart__detail-index ${
                            safeActiveDetailBulletIndex === bulletIndex ? 'architecture-flowchart__detail-index--active' : ''
                          }`}
                          aria-hidden="true"
                        >
                          {bulletIndex + 1}
                        </span>
                        <span className="architecture-guide-ring__node-label">
                          <span className="architecture-flowchart__bullet-icon" aria-hidden="true">
                            {getTopicIcon(bullet.label, guidedLayer.icon)}
                          </span>
                          <span>{bullet.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

              </section>
            ) : null}
          </div>
        )}
      </Card>
    </main>
  );
}
