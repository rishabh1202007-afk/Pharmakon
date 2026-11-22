import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { animate, createTimeline, remove, stagger } from 'animejs';
import type { AiDraftOutput } from '../types/domain';

const evidenceTraceSteps = [
  {
    key: 'variant-evidence',
    title: 'Variant Evidence',
    claim: 'Risk originates from observed genetic variation',
    evidence: ['rs4244285 identified → loss-of-function allele', 'Mapped to CYP2C19 gene'],
    tag: 'rsID • Variant-level evidence',
    tracePath: {
      claim: 'Risk originates from observed genetic variation',
      evidence: ['rs4244285 identified → loss-of-function allele', 'Mapped to CYP2C19 gene'],
      tag: 'rsID • Variant-level evidence',
    },
    animation: 'fade',
  },
  {
    key: 'phenotype-inference',
    title: 'Phenotype Inference',
    claim: 'Variant is translated into clinically meaningful metabolism class',
    evidence: ['Diplotype *2/*2 → Poor metabolizer classification', 'Deterministic phenotype mapping applied'],
    tag: 'Diplotype • Phenotype engine',
    tracePath: {
      claim: 'Variant is translated into clinically meaningful metabolism class',
      evidence: ['Diplotype *2/*2 → Poor metabolizer classification', 'Deterministic phenotype mapping applied'],
      tag: 'Diplotype • Phenotype engine',
    },
    animation: 'slide',
  },
  {
    key: 'guideline-mapping',
    title: 'Guideline Mapping',
    claim: 'Clinical action is derived from established guidelines',
    evidence: ['CPIC SSRI CYP2C19 Level A rule matched', 'Applies to poor metabolizer phenotype'],
    tag: 'CPIC Level A • Rule engine',
    tracePath: {
      claim: 'Clinical action is derived from established guidelines',
      evidence: ['CPIC SSRI CYP2C19 Level A rule matched', 'Applies to poor metabolizer phenotype'],
      tag: 'CPIC Level A • Rule engine',
    },
    animation: 'appear',
  },
  {
    key: 'final-decision',
    title: 'Final Decision',
    claim: 'Recommendation is reproducible and reviewable',
    evidence: ['Synthetic research output; no treatment recommendation generated', 'Decision path, rule version, timestamp logged'],
    tag: 'Audit log • Deterministic output',
    tracePath: {
      claim: 'Recommendation is reproducible and reviewable',
      evidence: ['Synthetic research output; no treatment recommendation generated', 'Decision path, rule version, timestamp logged'],
      tag: 'Audit log • Deterministic output',
    },
    animation: 'complete',
  },
] as const;

const trustMechanisms = [
  'Deterministic rule execution with visible variant → gene → rule mapping.',
  'No black-box override of CPIC / PharmGKB-linked rule outputs.',
  'Reproducible outputs under identical inputs and ruleset version.',
  'Failure-awareness disclosure when evidence is limited or incomplete.',
  'Audit-ready metadata for governance, compliance, and sign-off workflows.',
] as const;

const clinicalValue = [
  {
    icon: '🛑',
    tone: 'risk',
    title: 'Unseen variability is a silent cost center.',
    lead: 'Genotype-blind prescribing creates:',
    bullets: ['avoidable adverse events', 'ineffective first-line therapies', 'extended recovery timelines'],
    result: 'Recurring, billable inefficiency.',
  },
  {
    icon: '💰',
    tone: 'cost',
    title: 'Incorrect first decisions compound downstream cost.',
    lead: 'Each miss triggers:',
    bullets: ['Repeat consultations', 'Additional diagnostics', 'Therapy switching cycles'],
    result: 'This is operational drag embedded in prescribing.',
  },
  {
    icon: '🏥',
    tone: 'trust',
    title: 'If a decision cannot be explained, it cannot be defended.',
    lead: 'Healthcare systems are moving toward:',
    bullets: ['evidence-linked prescribing', 'audit-ready traceability', 'guideline adherence'],
    result: 'Opacity increases audit and litigation exposure.',
  },
] as const;

const clinicalImpactSignals = [
  'CFO Snapshot',
  '• Cost currently leaking: Active',
  '• Risk visibility: Low',
  '• Audit defensibility: Partial',
  '• With PharmaKon: Controlled, measurable, auditable',
] as const;

const auditSimulationWithout = [
  'No traceable decision path',
  'No explicit evidence linkage',
  'No reproducible reasoning',
] as const;

const auditSimulationWith = [
  'Variant → diplotype → phenotype trace',
  'CPIC/PharmGKB rule linkage',
  'Timestamped decision logs',
] as const;

const proofImpactSignals = [
  '↓ Preventable toxicity risk',
  '↓ Trial-and-error prescribing',
  '↑ Decision reproducibility',
] as const;

const genotypeBlindRisks = [
  'Genetic variability remains invisible at order entry',
  'Standard dosing applied across heterogeneous metabolism profiles',
  'CPIC/PharmGKB guidance underutilized in real-time workflows',
  'Decisions lack traceable reasoning and auditability',
] as const;

const genotypeAwareCapabilities = [
  'Variant → diplotype → phenotype inference at order time',
  'Deterministic CPIC-aligned rule execution',
  'Real-time surfacing of actionable pharmacogenomic risk',
  'Full traceability: evidence, rules, confidence, audit logs',
] as const;

const systemGuarantees = [
  {
    label: 'EVIDENCE INTEGRITY',
    icon: '🧬',
    headline: 'Evidence is not inferred — it is explicitly mapped',
    lead: null,
    points: [
      'CPIC Level A/B rules anchored to variant-level evidence (rsIDs)',
      'PharmGKB-supported gene–drug relationships',
      'Every recommendation tied to a verifiable clinical source',
    ],
    result: 'No recommendation exists without evidence grounding',
  },
  {
    label: 'DETERMINISTIC DECISION SYSTEM',
    icon: '⚙️',
    headline: 'The system does not guess — it executes',
    lead: null,
    points: [
      'Identical inputs always produce identical outputs',
      'Variant → diplotype → phenotype → guideline → decision',
      'No stochastic models in final decision path',
    ],
    result: 'Eliminates variability across clinicians and environments',
  },
  {
    label: 'TRACEABILITY & GOVERNANCE',
    icon: '🔍',
    headline: 'Every decision is auditable at clinical review level',
    lead: 'Each output includes:',
    points: [
      'Variant input (rsID-level)',
      'Diplotype resolution',
      'Rule execution path',
      'Guideline source + level',
      'Confidence + uncertainty signals',
      'Timestamp + versioned rule reference',
    ],
    result: 'Fully reproducible and reviewable',
  },
  {
    label: 'SAFETY LAYER',
    icon: '🛡️',
    headline: 'Unsafe or uncertain outputs are explicitly blocked',
    lead: null,
    points: [
      'Low-confidence or out-of-distribution cases flagged',
      'Safety layer prevents unsupported recommendations',
      'Counterfactual simulation available for alternatives',
    ],
    result: 'System defaults to safety, not assumption',
  },
  {
    label: 'RESEARCH-STAGE FOUNDATION',
    icon: '🧪',
    headline: 'Research-stage prototype architecture',
    lead: null,
    points: ['Synthetic test cases and prototype rule mapping', 'CPIC guideline data structure reference', 'Configurable site-specific evaluation workflows'],
    result: 'Architecture demonstrated for research and evaluation',
  },
] as const;

const sampleClinicalOutput: AiDraftOutput = {
  patient_id: 'SYNTHETIC-DEMO',
  drug: 'Citalopram (Demo Reference)',
  timestamp: '2026-04-02T09:42:00Z',
  risk_assessment: {
    risk_label: 'Synthetic Reference Only',
    confidence_score: 0.0,
    severity: 'moderate',
  },
  pharmacogenomic_profile: {
    primary_gene: 'CYP2C19 (Research Prototype)',
    diplotype: 'Synthetic Reference (*2/*2)',
    phenotype: 'Research Prototype Classification',
    detected_variants: [
      {
        rsid: 'rs4244285',
        evidence: 'Synthetic variant reference',
      },
    ],
  },
  clinical_recommendation: {
    action: 'CLINICAL MATCHING AND PRESCRIBING DISABLED. SYNTHETIC DEMO ONLY.',
    rationale: 'This example illustrates structured evidence parsing in a research prototype. No treatment decision is generated or authorized.',
  },
  llm_generated_explanation: {
    summary: 'Synthetic demonstration of structured evidence formatting.',
    next_step: 'For research evaluation only. Not for clinical use.',
  },
  quality_metrics: {
    vcf_parsing_success: true,
    variant_line_count: 1,
    file_name: 'synthetic_demo_case.vcf',
  },
};

const sampleGuidelineEvidence = {
  source: 'CPIC Guideline Reference (Synthetic Demo)',
  level: 'Research Reference',
  ruleMatch: 'Synthetic prototype rule reference',
} as const;

const sampleAuditTrail = {
  ruleVersion: 'Research Prototype v2026.03',
  reviewStatus: 'Synthetic Demo — Not for Clinical Use',
  decisionPath: 'Synthetic evidence parsing demonstration',
} as const;

const fullDecisionTrace = {
  notice: 'SYNTHETIC DEMO — NOT FOR CLINICAL USE',
  variant: {
    rsid: 'rs4244285',
    gene: 'CYP2C19',
    call: 'Synthetic reference',
  },
  diplotype: 'Synthetic reference (*2/*2)',
  phenotype: 'Research prototype classification',
  guideline: {
    source: 'CPIC Reference',
    level: 'Research Only',
    rule: 'Synthetic structure demonstration',
  },
  recommendation: 'Clinical matching and prescribing disabled',
} as const;

const systemDepthScale = [
  { label: 'Variants processed', value: 'Engineering Foundation' },
  { label: 'Gene–drug relationships', value: 'Registry Metadata' },
  { label: 'CPIC-aligned clinical rules', value: 'Guideline Reference' },
  { label: 'Simulated clinical cases', value: 'Synthetic Demo Data' },
] as const;

const systemDepthCoverage = {
  genes: ['CYP2D6', 'CYP2C19', 'CYP2C9', 'SLCO1B1', 'TPMT', 'DPYD', 'VKORC1', 'UGT1A1'],
  drugClasses: ['SSRIs', 'Anticoagulants', 'Statins', 'Oncology', 'Pain Management'],
  guidelines: [
    { label: 'CPIC Level A', value: '65+' },
    { label: 'CPIC Level B', value: '120+' },
  ],
} as const;

const systemDepthPhenotypes = [
  'Poor metabolizer',
  'Intermediate metabolizer',
  'Normal metabolizer',
  'Rapid / Ultra-rapid metabolizer',
] as const;

const systemDepthCorePipeline = [
  { stage: 'Variant Normalization', detail: 'rsID standardization, allele harmonization' },
  { stage: 'Diplotype Resolver', detail: 'star allele mapping (CNV-aware)' },
  { stage: 'Phenotype Inference', detail: 'deterministic classification' },
  { stage: 'Guideline Engine', detail: 'CPIC rule execution' },
  { stage: 'Decision Engine', detail: 'Safe / Adjust Dose / Toxic / Ineffective / Contraindicated' },
] as const;

const systemDepthSafetyPipeline = [
  { stage: 'Safety Layer', detail: 'blocks unsafe / low-confidence outputs' },
  { stage: 'Confidence Module', detail: 'calibrated confidence + disagreement tracking' },
  { stage: 'Counterfactual Engine', detail: 'alternative outcome simulation' },
  { stage: 'Audit System', detail: 'full traceability (inputs, rules, timestamps)' },
] as const;

const sampleReasoningChain = [
  'Synthetic variant reference (rs4244285)',
  'Research prototype gene mapping (CYP2C19)',
  'Synthetic phenotype classification reference',
  'CPIC guideline data structure reference',
  'Synthetic demonstration output generated',
] as const;


function formatUtcTimestamp(isoTimestamp: string): string {
  return new Date(isoTimestamp).toISOString().replace('T', ' ').slice(0, 16);
}

type DisclosureKey = 'limits' | 'audit' | 'fullTrace';
type SimulationMode = 'without' | 'with';
type SimulationPhase = 'idle' | 'intervening';
type TraceViewMode = 'simplified' | 'full';
type RoiMetrics = { adverseEventsPrevented: number; costSavings: number; efficiencyGain: number };
type AuditSimulationMode = 'without' | 'with';

type SimulationItem = {
  key: string;
  text: string;
  step?: number;
  tooltip?: string;
};

type SimulationPanel = {
  title: string;
  items: readonly SimulationItem[];
};

function calculateRoiMetrics(monthlyPrescriptions: number, pgxAffectedPercent: number, adverseEventPercent: number): RoiMetrics {
  const pgxShare = pgxAffectedPercent / 100;
  const adverseShare = adverseEventPercent / 100;

  const adverseEventsPrevented = monthlyPrescriptions * pgxShare * adverseShare * 0.3;
  const costSavings = adverseEventsPrevented * 8000;
  const efficiencyGain = monthlyPrescriptions * pgxShare * 0.2;

  return { adverseEventsPrevented, costSavings, efficiencyGain };
}

const simulationPanelsByMode: Record<SimulationMode, { left: SimulationPanel; center: SimulationPanel; right: SimulationPanel }> = {
  without: {
    left: {
      title: 'Clinical context',
      items: [
        { key: 'without-genotype', text: 'Genotype: Not available' },
        { key: 'without-phenotype', text: 'Phenotype: Not inferred' },
      ],
    },
    center: {
      title: 'Prescribing event',
      items: [
        { key: 'without-drug', text: 'Drug: Citalopram' },
        { key: 'without-dose', text: 'Dose: Standard' },
        { key: 'without-check', text: 'Genomic check: Not performed → Decision committed' },
      ],
    },
    right: {
      title: 'Outcome risk',
      items: [
        { key: 'without-toxicity', text: 'Elevated toxicity risk' },
        { key: 'without-response', text: 'Possible non-response' },
        { key: 'without-trial', text: 'Trial-and-error prescribing' },
      ],
    },
  },
  with: {
    left: {
      title: 'Genomic input',
      items: [
        {
          key: 'with-variant',
          text: 'Variant: rs4244285 (Synthetic)',
          step: 1,
          tooltip: 'Synthetic rsID reference for prototype demonstration.',
        },
        { key: 'with-gene', text: 'Gene: CYP2C19 (Prototype)', step: 1 },
      ],
    },
    center: {
      title: 'Research-stage interpretation',
      items: [
        { key: 'with-phenotype', text: 'Phenotype: Research Reference', step: 2 },
        {
          key: 'with-cpic',
          text: 'CPIC Guideline Reference',
          step: 3,
          tooltip: 'Research reference mapping',
        },
      ],
    },
    right: {
      title: 'Synthetic demonstration output',
      items: [
        { key: 'with-recommendation', text: 'Clinical matching disabled (Synthetic Demo)', step: 4 },
        { key: 'with-risk', text: 'Synthetic evaluation reference', step: 4 },
        { key: 'with-confidence', text: 'Confidence: Not applicable', step: 4 },
      ],
    },
  },
};

export function LandingPage() {
  const landingRootRef = useRef<HTMLElement | null>(null);
  const spotlightTimeoutRef = useRef<number | null>(null);
  const simulationTimeoutsRef = useRef<number[]>([]);
  const confidenceRafRef = useRef<number | null>(null);
  const lossIntroRafRef = useRef<number | null>(null);
  const lossMetricsRafRef = useRef<number | null>(null);
  const lossPulseTimeoutRef = useRef<number | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [spotlightSectionId, setSpotlightSectionId] = useState<string | null>(null);
  const [simulationMode, setSimulationMode] = useState<SimulationMode>('without');
  const [simulationPhase, setSimulationPhase] = useState<SimulationPhase>('idle');
  const [simulationTransitioning, setSimulationTransitioning] = useState(false);
  const [simulationVisibleStep, setSimulationVisibleStep] = useState(0);
  const [interventionVisibleStep, setInterventionVisibleStep] = useState(0);
  const [confidenceDisplay, setConfidenceDisplay] = useState(0);
  const [traceViewMode, setTraceViewMode] = useState<TraceViewMode>('simplified');
  const [auditSimulationMode, setAuditSimulationMode] = useState<AuditSimulationMode>('without');
  const [lossMonthlyPrescriptions, setLossMonthlyPrescriptions] = useState(200);
  const [lossPgxImpactPercent, setLossPgxImpactPercent] = useState(10);
  const [lossAdverseBaselinePercent, setLossAdverseBaselinePercent] = useState(5);
  const [lossMetrics, setLossMetrics] = useState<RoiMetrics>(() => calculateRoiMetrics(200, 10, 5));
  const lossMetricsRef = useRef<RoiMetrics>(lossMetrics);
  const [lossMetricsPulsing, setLossMetricsPulsing] = useState(false);
  const [expanded, setExpanded] = useState<Record<DisclosureKey, boolean>>({
    limits: false,
    audit: false,
    fullTrace: false,
  });

  const toggleDisclosure = (key: DisclosureKey) => {
    setExpanded((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  };

  const primaryVariant = sampleClinicalOutput.pharmacogenomic_profile.detected_variants[0];
  const generatedAtUtc = formatUtcTimestamp(sampleClinicalOutput.timestamp);

  const withoutFlowNodes = ['Hidden Variant', 'Blind Decision', 'Risk'] as const;
  const withFlowNodes = ['Variant', 'Phenotype', 'Guideline', 'Decision'] as const;
  const interventionSteps = ['Variant detected', 'Phenotype inferred', 'Guideline applied'] as const;
  const flowMode: SimulationMode = simulationPhase === 'intervening' ? 'with' : simulationMode;
  const activeFlowNodes = flowMode === 'with' ? withFlowNodes : withoutFlowNodes;
  const flowProgress = flowMode === 'with' ? (simulationPhase === 'intervening' ? interventionVisibleStep : simulationVisibleStep) : activeFlowNodes.length;
  const simulationPanels = simulationPanelsByMode[simulationMode];
  const lossTargetMetrics = calculateRoiMetrics(lossMonthlyPrescriptions, lossPgxImpactPercent, lossAdverseBaselinePercent);

  const clearSimulationTimers = () => {
    simulationTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    simulationTimeoutsRef.current = [];
    if (confidenceRafRef.current) {
      window.cancelAnimationFrame(confidenceRafRef.current);
      confidenceRafRef.current = null;
    }
  };

  const animateConfidenceTo = (target: number) => {
    if (confidenceRafRef.current) {
      window.cancelAnimationFrame(confidenceRafRef.current);
      confidenceRafRef.current = null;
    }

    const startingValue = confidenceDisplay;
    const delta = target - startingValue;
    const duration = 2100;
    const start = performance.now();

    const tick = (time: number) => {
      const progress = Math.min((time - start) / duration, 1);
      const next = Math.round(startingValue + delta * progress);
      setConfidenceDisplay(next);

      if (progress < 1) {
        confidenceRafRef.current = window.requestAnimationFrame(tick);
      } else {
        confidenceRafRef.current = null;
      }
    };

    confidenceRafRef.current = window.requestAnimationFrame(tick);
  };

  const runWithSimulationSequence = () => {
    setSimulationVisibleStep(0);
    setConfidenceDisplay(0);

    [460, 920, 1380, 1840].forEach((delay, index) => {
      const timeoutId = window.setTimeout(() => {
        setSimulationVisibleStep(index + 1);
      }, delay);
      simulationTimeoutsRef.current.push(timeoutId);
    });
  };

  const switchSimulationMode = (nextMode: SimulationMode) => {
    if (nextMode === simulationMode && simulationPhase === 'idle' && !simulationTransitioning) {
      return;
    }

    clearSimulationTimers();
    setSimulationTransitioning(true);

    if (nextMode === 'with') {
      const fadeTimeout = window.setTimeout(() => {
        setSimulationTransitioning(false);
        setSimulationPhase('intervening');
        setInterventionVisibleStep(0);
      }, 440);
      simulationTimeoutsRef.current.push(fadeTimeout);

      [500, 920, 1480].forEach((delay, index) => {
        const stepTimeout = window.setTimeout(() => {
          setInterventionVisibleStep(index + 1);
        }, 440 + delay);
        simulationTimeoutsRef.current.push(stepTimeout);
      });

      const finalizeTimeout = window.setTimeout(() => {
        setSimulationMode('with');
        setSimulationPhase('idle');
        setInterventionVisibleStep(0);
        runWithSimulationSequence();
      }, 2550);
      simulationTimeoutsRef.current.push(finalizeTimeout);
      return;
    }

    const withoutTimeout = window.setTimeout(() => {
      setSimulationMode('without');
      setSimulationPhase('idle');
      setInterventionVisibleStep(0);
      setSimulationVisibleStep(0);
      setConfidenceDisplay(0);
      setSimulationTransitioning(false);
    }, 440);
    simulationTimeoutsRef.current.push(withoutTimeout);
  };

  const playSimulation = () => {
    clearSimulationTimers();
    setSimulationPhase('idle');
    setInterventionVisibleStep(0);
    setSimulationTransitioning(false);
    setSimulationMode('without');
    setSimulationVisibleStep(0);
    setConfidenceDisplay(0);

    const timeoutId = window.setTimeout(() => {
      switchSimulationMode('with');
    }, 1150);

    simulationTimeoutsRef.current.push(timeoutId);
  };

  useEffect(() => {
    if (simulationMode === 'with' && simulationVisibleStep >= 4) {
      animateConfidenceTo(94);
      return;
    }

    if (simulationMode === 'without') {
      setConfidenceDisplay(0);
    }
  }, [simulationMode, simulationVisibleStep]);

  useEffect(
    () => () => {
      clearSimulationTimers();
    },
    [],
  );

  useEffect(() => {
    const startValues = {
      monthlyPrescriptions: 200,
      pgxImpactPercent: 10,
      adverseBaselinePercent: 5,
    };

    const targetValues = {
      monthlyPrescriptions: 1000,
      pgxImpactPercent: 30,
      adverseBaselinePercent: 12,
    };

    const duration = 1700;
    const startedAt = performance.now();

    const tick = (time: number) => {
      const progress = Math.min((time - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 2.2);

      setLossMonthlyPrescriptions(
        Math.round(
          startValues.monthlyPrescriptions +
            (targetValues.monthlyPrescriptions - startValues.monthlyPrescriptions) * eased,
        ),
      );
      setLossPgxImpactPercent(
        Math.round(startValues.pgxImpactPercent + (targetValues.pgxImpactPercent - startValues.pgxImpactPercent) * eased),
      );
      setLossAdverseBaselinePercent(
        Math.round(
          startValues.adverseBaselinePercent +
            (targetValues.adverseBaselinePercent - startValues.adverseBaselinePercent) * eased,
        ),
      );

      if (progress < 1) {
        lossIntroRafRef.current = window.requestAnimationFrame(tick);
        return;
      }

      lossIntroRafRef.current = null;
      setLossMonthlyPrescriptions(targetValues.monthlyPrescriptions);
      setLossPgxImpactPercent(targetValues.pgxImpactPercent);
      setLossAdverseBaselinePercent(targetValues.adverseBaselinePercent);
    };

    lossIntroRafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (lossIntroRafRef.current) {
        window.cancelAnimationFrame(lossIntroRafRef.current);
        lossIntroRafRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (lossMetricsRafRef.current) {
      window.cancelAnimationFrame(lossMetricsRafRef.current);
      lossMetricsRafRef.current = null;
    }

    if (lossPulseTimeoutRef.current) {
      window.clearTimeout(lossPulseTimeoutRef.current);
      lossPulseTimeoutRef.current = null;
    }

    const start = lossMetricsRef.current;
    const target = lossTargetMetrics;
    const startedAt = performance.now();
    const duration = 520;
    setLossMetricsPulsing(true);

    const tick = (time: number) => {
      const progress = Math.min((time - startedAt) / duration, 1);
      const next: RoiMetrics = {
        adverseEventsPrevented: start.adverseEventsPrevented + (target.adverseEventsPrevented - start.adverseEventsPrevented) * progress,
        costSavings: start.costSavings + (target.costSavings - start.costSavings) * progress,
        efficiencyGain: start.efficiencyGain + (target.efficiencyGain - start.efficiencyGain) * progress,
      };

      lossMetricsRef.current = next;
      setLossMetrics(next);

      if (progress < 1) {
        lossMetricsRafRef.current = window.requestAnimationFrame(tick);
        return;
      }

      lossMetricsRafRef.current = null;
      lossMetricsRef.current = target;
      setLossMetrics(target);
      lossPulseTimeoutRef.current = window.setTimeout(() => {
        setLossMetricsPulsing(false);
        lossPulseTimeoutRef.current = null;
      }, 340);
    };

    lossMetricsRafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (lossMetricsRafRef.current) {
        window.cancelAnimationFrame(lossMetricsRafRef.current);
        lossMetricsRafRef.current = null;
      }
    };
  }, [lossTargetMetrics.adverseEventsPrevented, lossTargetMetrics.costSavings, lossTargetMetrics.efficiencyGain]);

  useEffect(
    () => () => {
      if (lossIntroRafRef.current) {
        window.cancelAnimationFrame(lossIntroRafRef.current);
      }
      if (lossMetricsRafRef.current) {
        window.cancelAnimationFrame(lossMetricsRafRef.current);
      }
      if (lossPulseTimeoutRef.current) {
        window.clearTimeout(lossPulseTimeoutRef.current);
      }
    },
    [],
  );

  const applySpotlight = (sectionId: string) => {
    setSpotlightSectionId(sectionId);

    if (spotlightTimeoutRef.current) {
      window.clearTimeout(spotlightTimeoutRef.current);
    }

    spotlightTimeoutRef.current = window.setTimeout(() => {
      setSpotlightSectionId(null);
      spotlightTimeoutRef.current = null;
    }, 2000);
  };

  const spotlightClassFor = (sectionId: string) => (spotlightSectionId === sectionId ? ' spotlight-target' : '');

  useEffect(
    () => () => {
      if (spotlightTimeoutRef.current) {
        window.clearTimeout(spotlightTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const root = landingRootRef.current;
    if (!root) {
      return;
    }

    const handleHashLinkClick = (event: MouseEvent) => {
      const clickTarget = event.target as HTMLElement | null;
      const anchor = clickTarget?.closest('a[href^="#"]') as HTMLAnchorElement | null;

      if (!anchor) {
        return;
      }

      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return;
      }

      const href = anchor.getAttribute('href') ?? '';
      const sectionId = href.startsWith('#') ? href.slice(1) : '';
      if (!sectionId) {
        return;
      }

      const targetSection = document.getElementById(sectionId);
      if (!targetSection) {
        return;
      }

      event.preventDefault();
      targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.replaceState(null, '', `#${sectionId}`);
      applySpotlight(sectionId);
    };

    root.addEventListener('click', handleHashLinkClick);

    return () => {
      root.removeEventListener('click', handleHashLinkClick);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const root = landingRootRef.current;
    if (!root) {
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return;
    }

    const clearMotionStyles = (element: HTMLElement | null) => {
      if (!element) {
        return;
      }
      element.style.removeProperty('opacity');
      element.style.removeProperty('transform');
    };

    const topbar = root.querySelector<HTMLElement>('.topbar--landing');
    const navTargets = Array.from(
      root.querySelectorAll<HTMLElement>('.topbar--landing .topbar-nav-links a, .topbar--landing .topbar-actions a'),
    );
    const sections = Array.from(root.querySelectorAll<HTMLElement>('.landing-section'));
    const heroMedia = root.querySelector<HTMLElement>('.clinical-snapshot');

    if (topbar) {
      topbar.style.opacity = '0';
      topbar.style.transform = 'translateY(-10px)';
    }

    navTargets.forEach((node) => {
      node.style.opacity = '0';
      node.style.transform = 'translateY(-6px)';
    });

    const topbarTimeline = createTimeline({ autoplay: false });

    if (topbar) {
      topbarTimeline.add(topbar, {
        opacity: [0, 1],
        translateY: [-10, 0],
        duration: 260,
        ease: 'outCubic',
        onComplete: () => clearMotionStyles(topbar),
      });
    }

    if (navTargets.length > 0) {
      topbarTimeline.add(
        navTargets,
        {
          opacity: [0, 1],
          translateY: [-6, 0],
          delay: stagger(50),
          duration: 240,
          ease: 'outCubic',
          onComplete: () => navTargets.forEach((node) => clearMotionStyles(node)),
        },
        topbar ? '-=160' : 0,
      );
    }

    topbarTimeline.play();

    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const section = entry.target as HTMLElement;
          if (section.id === 'proof-block') {
            section.classList.add('proof-contrast--revealed');
          }

          if (section.id === 'claim-evidence') {
            section.classList.add('trace-flow--revealed');
          }

          if (section.id === 'audit-simulation' || section.id === 'loss-surface' || section.id === 'decision-point') {
            section.classList.add('is-revealed');
          }

          observer.unobserve(section);
        });
      },
      {
        threshold: 0.16,
        rootMargin: '0px 0px -10% 0px',
      },
    );

    sections.forEach((section) => revealObserver.observe(section));

    const heroFloat = heroMedia
      ? animate(heroMedia, {
          translateY: [0, -5],
          direction: 'alternate',
          loop: true,
          duration: 3600,
          delay: 800,
          ease: 'inOutSine',
        })
      : null;

    return () => {
      revealObserver.disconnect();
      topbarTimeline.pause();
      heroFloat?.pause();

      const allStepNodes = Array.from(root.querySelectorAll<HTMLElement>('[data-output-step]'));
      remove(
        [topbar, ...navTargets, ...sections, heroMedia, ...allStepNodes].filter(
          (node): node is HTMLElement => Boolean(node),
        ),
      );
    };
  }, []);

  useEffect(() => {
    const root = landingRootRef.current;
    if (!root) {
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return;
    }

    let lastY = window.scrollY;
    let direction: 'down' | 'up' = 'down';
    let scrollTicking = false;

    const handleDirectionalScroll = () => {
      if (scrollTicking) {
        return;
      }

      scrollTicking = true;
      window.requestAnimationFrame(() => {
        const currentY = window.scrollY;
        direction = currentY >= lastY ? 'down' : 'up';
        lastY = currentY;
        scrollTicking = false;
      });
    };

    window.addEventListener('scroll', handleDirectionalScroll, { passive: true });

    const cinematicSections = Array.from(
      root.querySelectorAll<HTMLElement>('.landing-section, .landing-section--entry-hero, .final-pressure-strip'),
    );

    const cinematicTargetSelector =
      '.landing-section__header, .entry-hero-content, .decision-sim-panel, .loss-metric-card, .audit-sim-card, .proof-contrast-card, .trust-proof-block, .clinical-output-card, .decision-chip, .value-card';

    const cinematicObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.24) {
            return;
          }

          const section = entry.target as HTMLElement;
          if (section.dataset.cinematicAnimating === '1') {
            return;
          }

          const now = performance.now();
          const lastAnimated = Number(section.dataset.cinematicTs ?? '0');

          if (now - lastAnimated < 900) {
            return;
          }

          section.dataset.cinematicAnimating = '1';

          const sectionOffset = direction === 'down' ? 12 : -12;
          const childOffset = direction === 'down' ? 8 : -8;

          remove(section);

          const targets = Array.from(section.querySelectorAll<HTMLElement>(cinematicTargetSelector)).slice(0, 8);

          if (targets.length > 0) {
            remove(targets);
          }

          const sectionTimeline = createTimeline({
            autoplay: false,
            onComplete: () => {
              section.dataset.cinematicAnimating = '0';
              section.dataset.cinematicTs = String(performance.now());
            },
          });

          sectionTimeline.add(section, {
            opacity: [0.86, 1],
            tranhslateY: [sectionOffset, 0],
            scale: [0.994, 1],
            duration: 1250,
            ease: 'inOutSine',
          });

          sectionTimeline.add(
            section,
            {
              boxShadow: [
                '0 0 0 1px rgba(123, 225, 255, 0.04), 0 10px 22px rgba(2, 8, 15, 0.18)',
                '0 0 0 1px rgba(123, 225, 255, 0.12), 0 18px 30px rgba(2, 8, 15, 0.26)',
                '0 14px 32px rgba(2, 8, 15, 0.3)',
              ],
              duration: 1450,
              ease: 'inOutSine',
            },
            0,
          );

          if (targets.length > 0) {
            sectionTimeline.add(
              targets,
              {
                opacity: [0.9, 1],
                translateY: [childOffset, 0],
                duration: 980,
                delay: stagger(90),
                ease: 'inOutSine',
              },
              80,
            );
          }

          sectionTimeline.play();
        });
      },
      {
        threshold: [0.16, 0.28],
        rootMargin: '0px 0px 18% 0px',
      },
    );

    cinematicSections.forEach((section) => cinematicObserver.observe(section));

    return () => {
      window.removeEventListener('scroll', handleDirectionalScroll);
      cinematicObserver.disconnect();

      remove(cinematicSections);
    };
  }, []);

  return (
    <main
      ref={landingRootRef}
      className={`page landing-page clinical-landing${spotlightSectionId ? ' clinical-landing--focus-mode' : ''}`}
      data-spotlight-target={spotlightSectionId ?? ''}
    >
      <header className={`topbar topbar--landing${isScrolled ? ' topbar--collapsed' : ''}`}>
        <img src="/PharmaKon.png" alt="PharmaKon Logo" className="wordmark" style={{ height: '42px', objectFit: 'contain' }} />
        <div className="topbar-menu">
          <nav className="topbar-nav-links">
            <a href="#proof-block">Why It Matters</a>
            <a href="#sample-output">Sign-off Output</a>
            <Link to="/architecture">Architecture</Link>
            <a href="#trust-signals">Trust Signals</a>
            <Link to="/login" className="topbar-staff-login-btn" style={{ marginLeft: '1rem', padding: '0.35rem 0.75rem', borderRadius: '4px', border: '1px solid rgba(123, 225, 255, 0.4)', background: 'rgba(123, 225, 255, 0.1)', color: 'inherit', textDecoration: 'none', fontWeight: 500, fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>Hospital Staff Login</Link>
          </nav>
        </div>
      </header>

      <section className="landing-section--entry-hero" aria-labelledby="entry-hero-title">
        <div className="entry-hero-content">
          <h1 id="entry-hero-title">
            <span className="entry-hero-headline-line entry-hero-headline-line--primary">
              You are making prescribing decisions
            </span>
            <span className="entry-hero-headline-line entry-hero-headline-line--secondary">without seeing genomic risk.</span>
          </h1>
          <p className="entry-hero-risk-accent" aria-hidden="true" />
          <p>This is not a system limitation.</p>
          <p className="entry-hero-supporting-line">This is a visibility gap in your current workflow.</p>
          <div className="entry-hero-actions">
            <a className="entry-hero-cta" href="#sample-output">
              See what your system is missing
            </a>
            <div className="entry-hero-links" aria-label="Secondary actions">
              <a className="entry-hero-link" href="#sample-output">
                View Sample Clinical Report
              </a>
              <Link className="entry-hero-link" to="/upload">
                Open VCF Research Intake
              </Link>
            </div>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <img
            src="/assets/genomic-visual.jpg"
            alt="Genomic clinical decision visualization"
            className="hero-image"
            loading="lazy"
          />
        </div>
        <div className="entry-hero-divider" aria-hidden="true" />
      </section>

      <section className="landing-section" id="loss-surface" aria-labelledby="loss-title">
        <header className="landing-section__header">
          <p className="landing-question">Illustrative Financial Impact Scenario</p>
          <h2 id="loss-title">Illustrative Financial Impact Scenario &amp; Assumptions</h2>
          <p id="loss-sub">
            All results are calculated estimates based on adjustable assumptions, not measured hospital outcomes.
          </p>
        </header>

        <div className="loss-surface-grid">
          <section className="loss-surface-inputs" aria-label="Loss estimate inputs">
            <label className="loss-surface-field">
              <span>Monthly prescriptions ({lossMonthlyPrescriptions})</span>
              <input
                type="range"
                min={200}
                max={5000}
                step={50}
                value={lossMonthlyPrescriptions}
                onChange={(event) => setLossMonthlyPrescriptions(Number(event.target.value))}
              />
            </label>

            <label className="loss-surface-field">
              <span>% pharmacogenomic impact ({lossPgxImpactPercent}%)</span>
              <input
                type="range"
                min={10}
                max={60}
                step={1}
                value={lossPgxImpactPercent}
                onChange={(event) => setLossPgxImpactPercent(Number(event.target.value))}
              />
            </label>

            <label className="loss-surface-field">
              <span>Adverse event baseline ({lossAdverseBaselinePercent}%)</span>
              <input
                type="range"
                min={5}
                max={25}
                step={1}
                value={lossAdverseBaselinePercent}
                onChange={(event) => setLossAdverseBaselinePercent(Number(event.target.value))}
              />
            </label>

            <div style={{ marginTop: '1.25rem', padding: '0.85rem', background: 'rgba(123, 225, 255, 0.05)', border: '1px solid rgba(123, 225, 255, 0.2)', borderRadius: '8px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>Calculation Methodology &amp; Assumptions:</strong>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'grid', gap: '0.25rem' }}>
                <li>Modeled event estimate = monthly prescriptions × PGx share × adverse-event baseline × 30% modeling factor.</li>
                <li>Modeled cost equivalent = modeled event estimate × ₹8,000 assumed cost.</li>
                <li>Modeled workflow cycles = monthly prescriptions × PGx share × 20% workflow-efficiency assumption.</li>
              </ul>
            </div>
          </section>

          <section className={`loss-surface-metrics${lossMetricsPulsing ? ' is-updating' : ''}`} aria-live="polite">
            <article className="loss-metric-card" id="loss-1">
              <h3>Illustrative Modeled Event Estimate</h3>
              <p className="loss-metric-card__value loss-metric-card__value--events">
                ~ {Math.round(lossMetrics.adverseEventsPrevented).toLocaleString('en-IN')} events / month
              </p>
              <p>→ modeled estimate based on user-adjustable sliders and 30% factor</p>
            </article>

            <article className="loss-metric-card" id="loss-2">
              <h3>Illustrative Cost-Equivalent Estimate</h3>
              <p className="loss-metric-card__value loss-metric-card__value--cost">
                ~ ₹ {Math.round(lossMetrics.costSavings).toLocaleString('en-IN')} / month
              </p>
              <p>→ modeled cost equivalent based on ₹8,000 assumed cost per event</p>
            </article>

            <article className="loss-metric-card" id="loss-3">
              <h3>Modeled Workflow Cycles</h3>
              <p className="loss-metric-card__value">~ {Math.round(lossMetrics.efficiencyGain).toLocaleString('en-IN')} rework cycles</p>
              <p>→ modeled rework cycles based on 20% efficiency assumption</p>
            </article>
          </section>
        </div>

        <p className="loss-surface-line" id="loss-line" style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(219, 154, 34, 0.1)', border: '1px solid rgba(219, 154, 34, 0.3)', borderRadius: '6px', color: '#f6ad55', fontSize: '0.86rem', textAlign: 'center' }}>
          Illustrative scenario estimates based on adjustable assumptions. These are not measured hospital outcomes, verified savings, proven clinical benefits, or guaranteed revenue recovery.
        </p>
      </section>

      <section
        className={`landing-section landing-section--hero decision-sim decision-sim--${simulationMode}`}
        aria-labelledby="decision-sim-title"
      >
        <header className="landing-section__header decision-sim-header">
          <h2 id="decision-sim-title">What your system does without genomic visibility</h2>
          <p id="decision-sim-subtitle">Default behavior in most hospitals</p>
        </header>

        <div className="decision-sim-toolbar" role="group" aria-label="Simulation mode">
          <button
            type="button"
            className={`decision-sim-toggle${simulationMode === 'without' ? ' is-active' : ''}`}
            onClick={() => switchSimulationMode('without')}
          >
            Without PharmaKon
          </button>
          <button
            type="button"
            className={`decision-sim-toggle${simulationMode === 'with' ? ' is-active' : ''}${simulationMode === 'without' ? ' decision-sim-toggle--dimmed' : ''}`}
            onClick={() => switchSimulationMode('with')}
          >
            With PharmaKon
          </button>
          <button type="button" className="decision-sim-play" onClick={playSimulation}>
            Play simulation
          </button>
        </div>

        <div className={`decision-sim-flow decision-sim-flow--${simulationMode}`} aria-label="Decision flow indicator">
          {activeFlowNodes.map((node, index) => {
            const isNodeActive = flowMode === 'with' ? index < Math.max(0, flowProgress) : true;
            const isArrowActive = flowMode === 'with' ? index < Math.max(0, flowProgress - 1) : true;

            return (
              <span key={node} className="decision-sim-flow__segment">
                <span className={`decision-sim-flow__node${isNodeActive ? ' is-active' : ''}`}>{node}</span>
                {index < activeFlowNodes.length - 1 ? (
                  <span className={`decision-sim-flow__arrow${isArrowActive ? ' is-active' : ''}`}>→</span>
                ) : null}
              </span>
            );
          })}
        </div>

        {simulationPhase === 'intervening' ? (
          <div className="decision-sim-intervention" role="status" aria-live="polite">
            <p className="decision-sim-intervention__title">PharmaKon intercepts decision</p>
            <ol className="decision-sim-intervention__steps">
              {interventionSteps.map((step, index) => (
                <li key={step} className={`decision-sim-intervention__step${interventionVisibleStep >= index + 1 ? ' is-visible' : ''}`}>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        <div
          className={`decision-sim-state${simulationTransitioning ? ' is-transitioning' : ''}${simulationPhase === 'intervening' ? ' is-hidden' : ''}`}
        >
          {(['left', 'center', 'right'] as const).map((panelKey) => {
            const panel = simulationPanels[panelKey];
            const panelToneClass = `decision-sim-list--${simulationMode}`;

            return (
              <aside key={panelKey} className={`decision-sim-panel decision-sim-panel--${panelKey}`} aria-label={`${panelKey} simulation panel`}>
                <p className="decision-sim-panel__title">{panel.title}</p>
                <ul
                  className={`decision-sim-list ${panelToneClass}${panelKey === 'right' && simulationMode === 'without' ? ' decision-sim-list--risk' : ''}${panelKey === 'right' && simulationMode === 'with' ? ' decision-sim-list--outcome' : ''}`}
                >
                  {panel.items.map((item) => {
                    const isVisible = simulationMode === 'with' ? simulationVisibleStep >= (item.step ?? 0) : true;
                    const text = item.key === 'with-confidence' ? `Confidence: ${confidenceDisplay}%` : item.text;
                    const isRiskCue = simulationMode === 'without' && (item.key === 'without-genotype' || item.key === 'without-check');

                    return (
                      <li key={item.key} className={`sim-step${isVisible ? ' is-visible' : ''}${isRiskCue ? ' sim-step--risk' : ''}`}>
                        {item.tooltip ? (
                          <span className="sim-tooltip" data-tooltip={item.tooltip}>
                            {text}
                          </span>
                        ) : (
                          text
                        )}
                      </li>
                    );
                  })}
                </ul>
              </aside>
            );
          })}
        </div>
      </section>

      <section className="landing-section" id="audit-simulation" aria-labelledby="audit-title">
        <header className="landing-section__header">
          <h2 id="audit-title">Can your prescribing workflow make its evidence traceable?</h2>
          <p id="audit-sub">Decision quality is measured by traceability under review pressure.</p>
          <p className="audit-sim-tag">Audit scenario: adverse event review</p>
        </header>

        <div className="audit-sim-toggle" role="group" aria-label="Audit simulation mode">
          <button
            type="button"
            className={`audit-sim-toggle__button${auditSimulationMode === 'without' ? ' is-active' : ''}`}
            onClick={() => setAuditSimulationMode('without')}
          >
            Simulate audit without PharmaKon
          </button>
          <button
            type="button"
            className={`audit-sim-toggle__button${auditSimulationMode === 'with' ? ' is-active' : ''}`}
            onClick={() => setAuditSimulationMode('with')}
          >
            Simulate audit with PharmaKon
          </button>
        </div>

        <div className="audit-sim-grid">
          <article
            className={`audit-sim-card audit-sim-card--without${auditSimulationMode === 'without' ? ' is-active' : ' is-inactive'}`}
            title="This is where most systems fail under review"
          >
            <p className="audit-sim-state-label">CURRENT STATE</p>
            <h3>Non-defensible</h3>
            <ul>
              {auditSimulationWithout.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="audit-sim-failure-line">No traceable reasoning → No clinical defense</p>
            <p>→ High audit friction and legal exposure</p>
          </article>

          <article className={`audit-sim-card audit-sim-card--with${auditSimulationMode === 'with' ? ' is-active' : ' is-inactive'}`}>
            <p className="audit-sim-state-label">DEFENSIBLE STATE</p>
            <h3>What survives audit</h3>
            <ul>
              {auditSimulationWith.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>→ Reproducible, reviewable, audit-ready</p>
          </article>
        </div>
      </section>

      <section className={`landing-section${spotlightClassFor('sample-output')}`} id="sample-output" aria-labelledby="sample-output-title">
        <header className="landing-section__header">
          <p className="landing-question">Simulated Pharmacogenomic Analysis</p>
          <h2 id="sample-output-title">Simulated Pharmacogenomic Analysis</h2>
          <div style={{ margin: '0.75rem 0', padding: '0.5rem 1rem', background: 'rgba(219, 154, 34, 0.15)', border: '1px solid rgba(219, 154, 34, 0.4)', borderRadius: '6px', color: '#f6ad55', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.05em', textAlign: 'center' }}>
            SYNTHETIC DEMO — NOT FOR CLINICAL USE (Clinical matching &amp; prescribing disabled)
          </div>
          <p>Illustrative research-stage demonstration. No clinical diagnosis, treatment recommendation, or validated confidence score is generated or authorized.</p>
        </header>

        <div className="clinical-output-panel">
          <div className="clinical-output-panel__top">
            <article className="decision-chip" data-output-step="1">
              <p className="decision-chip__label">Synthetic Demo Reference</p>
              <h3>
                {sampleClinicalOutput.drug} · {sampleClinicalOutput.pharmacogenomic_profile.primary_gene}
              </h3>
              <p className="decision-chip__meta">Classification: {sampleClinicalOutput.pharmacogenomic_profile.phenotype}</p>
            </article>

            <article className="decision-chip" data-output-step="2">
              <p className="decision-chip__label">Status</p>
              <p className="risk-pill risk-pill--moderate">{sampleClinicalOutput.risk_assessment.risk_label}</p>
              <p className="decision-chip__meta">Guideline strength: {sampleGuidelineEvidence.level}</p>
              <p className="decision-chip__meta decision-chip__meta--confidence">Confidence: Not Applicable</p>
            </article>
          </div>

          <div className="clinical-output-panel__grid">
            <section className="clinical-output-card clinical-output-card--facts" data-output-step="1">
              <h3>Synthetic Evidence Summary</h3>
              <div className="clinical-kv-list">
                <p>
                  <span>Reference Drug</span>
                  <strong>{sampleClinicalOutput.drug}</strong>
                </p>
                <p>
                  <span>Primary gene</span>
                  <strong>{sampleClinicalOutput.pharmacogenomic_profile.primary_gene}</strong>
                </p>
                <p>
                  <span>Classification</span>
                  <strong>{sampleClinicalOutput.pharmacogenomic_profile.phenotype}</strong>
                </p>
                <p>
                  <span>Variant evidence</span>
                  <strong>
                    {primaryVariant.rsid} ({primaryVariant.evidence})
                  </strong>
                </p>
              </div>

              <div className="guideline-evidence" data-output-step="4">
                <h4>Guideline Reference</h4>
                <p>
                  <span>Guideline Source</span>
                  <strong>{sampleGuidelineEvidence.source}</strong>
                </p>
                <p>
                  <span>Evidence Level</span>
                  <strong className="guideline-level-emphasis">{sampleGuidelineEvidence.level}</strong>
                </p>
                <p>
                  <span>Rule Match</span>
                  <strong>{sampleGuidelineEvidence.ruleMatch}</strong>
                </p>
                <p>
                  <span>Source references</span>
                  <strong>Research Prototype</strong>
                </p>
              </div>
            </section>

            <section className="clinical-output-card clinical-output-card--recommendation" data-output-step="3">
              <h3>Research Prototype Notice</h3>
              <p>{sampleClinicalOutput.clinical_recommendation.action}</p>
              <p>{sampleClinicalOutput.clinical_recommendation.rationale}</p>

              <div className="reasoning-chain">
                <h4>Visible Evidence Walkthrough (Synthetic)</h4>
                <ol>
                  {sampleReasoningChain.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            </section>
          </div>

          <div className="clinical-output-panel__bottom">
            <article className="clinical-disclosure">
              <button
                type="button"
                className="clinical-disclosure__toggle"
                onClick={() => toggleDisclosure('limits')}
                aria-expanded={expanded.limits}
                aria-controls="results-limits"
              >
                When this system may be limited
              </button>
              <div
                id="results-limits"
                className={`clinical-disclosure__body${expanded.limits ? ' is-open' : ''}`}
              >
                <ul>
                  <li>Incomplete variant coverage in uploaded VCF</li>
                  <li>Novel or rare variants without validated guideline mapping</li>
                  <li>Conflicting or low-consensus literature evidence for specific variant-drug interactions</li>
                </ul>
                <p>
                  If limitations are present, recommendation should be reviewed with clinical genetics and pharmacy
                  oversight before prescribing action.
                </p>
              </div>
            </article>

            <article className="clinical-disclosure">
              <button
                type="button"
                className="clinical-disclosure__toggle"
                onClick={() => toggleDisclosure('audit')}
                aria-expanded={expanded.audit}
                aria-controls="audit-trail"
              >
                Audit Trail
              </button>
              <div id="audit-trail" className={`clinical-disclosure__body${expanded.audit ? ' is-open' : ''}`}>
                <div className="audit-kv-list">
                  <p>
                    <span>Rule version</span>
                    <strong>{sampleAuditTrail.ruleVersion}</strong>
                  </p>
                  <p>
                    <span>Generated at (UTC)</span>
                    <strong>{generatedAtUtc}</strong>
                  </p>
                  <p>
                    <span>Decision path</span>
                    <strong>{sampleAuditTrail.decisionPath}</strong>
                  </p>
                  <p>
                    <span>Review status</span>
                    <strong>{sampleAuditTrail.reviewStatus}</strong>
                  </p>
                </div>
              </div>
            </article>
          </div>

          <p className="clinical-output-accountability-line">Every step is reviewable. Every outcome is accountable.</p>
        </div>
      </section>

      <section className="landing-section landing-section--explainability" aria-labelledby="explainability-backbone-title">
        <header className="landing-section__header">
          <p className="landing-question">Transparency architecture</p>
          <h2 id="explainability-backbone-title">Explainability &amp; Evidence Backbone</h2>
          <p>
            Why this system recommends a clinical action is fully visible — from evidence source to rule match to
            final recommendation.
          </p>
        </header>

        <div className="explainability-grid">
          <article className="explainability-card">
            <h3>
              <span className="explainability-card__icon" aria-hidden="true">
                🗄️
              </span>
              Clinical Evidence Foundation
            </h3>
            <ul>
              <li>CPIC guideline integration (Level A/B recommendations)</li>
              <li>PharmGKB-supported gene–drug mappings</li>
              <li>Curated variant–phenotype translation datasets</li>
              <li>Internal dataset for simulation and validation</li>
            </ul>
            <p className="explainability-card__note">
              All recommendations are grounded in established pharmacogenomic evidence sources.
            </p>
          </article>

          <article className="explainability-card">
            <h3>
              <span className="explainability-card__icon" aria-hidden="true">
                🧠
              </span>
              Deterministic Inference Engine
            </h3>
            <ul>
              <li>Variant normalization to rsID-level representation</li>
              <li>Diplotype resolution (for example CYP2C19 *1/*2)</li>
              <li>Phenotype inference (for example Poor metabolizer)</li>
              <li>Rule-based guideline execution (CPIC / PharmGKB)</li>
            </ul>
            <p className="explainability-card__emphasis">
              No black-box prediction — all outputs follow explicit clinical rules.
            </p>
          </article>

          <article className="explainability-card">
            <h3>
              <span className="explainability-card__icon" aria-hidden="true">
                🧬
              </span>
              Genomic &amp; Pharmacogene Coverage
            </h3>
            <ul>
              <li>Supported genes include CYP2C19, CYP2D6, CYP2C9, SLCO1B1, TPMT, and DPYD</li>
              <li>Diplotype handling across major pharmacogenes</li>
              <li>
                Metabolizer classes:
                <ul className="explainability-sublist">
                  <li>Poor</li>
                  <li>Intermediate</li>
                  <li>Normal</li>
                  <li>Rapid / Ultra-rapid</li>
                </ul>
              </li>
            </ul>
            <p className="explainability-card__note">Coverage is extensible and configurable per deployment.</p>
          </article>

          <article className="explainability-card explainability-card--trace">
            <h3>
              <span className="explainability-card__icon" aria-hidden="true">
                🔁
              </span>
              Explainable Decision Path
            </h3>
            <div className="decision-trace-flow" aria-label="Decision trace flow">
              <p>
                <span>Variant detected</span>
                <strong className="trace-highlight trace-highlight--rsid">rs4244285</strong>
              </p>
              <span className="decision-trace-flow__arrow" aria-hidden="true">
                ↓
              </span>
              <p>
                <span>Diplotype resolved</span>
                <strong className="trace-highlight trace-highlight--diplotype">*2/*2</strong>
              </p>
              <span className="decision-trace-flow__arrow" aria-hidden="true">
                ↓
              </span>
              <p>
                <span>Phenotype inferred</span>
                <strong>Poor metabolizer</strong>
              </p>
              <span className="decision-trace-flow__arrow" aria-hidden="true">
                ↓
              </span>
              <p>
                <span>Guideline matched</span>
                <strong className="trace-highlight trace-highlight--cpic">CPIC SSRI CYP2C19 Level A</strong>
              </p>
              <span className="decision-trace-flow__arrow" aria-hidden="true">
                ↓
              </span>
              <p>
                <span>Recommendation</span>
                <strong>Clinical matching and prescribing disabled</strong>
              </p>
            </div>
            <p className="explainability-card__note">Each step is traceable, auditable, and reproducible.</p>
          </article>
        </div>

        <article className="explainability-trace-panel">
          <button
            type="button"
            className="clinical-disclosure__toggle"
            onClick={() => toggleDisclosure('fullTrace')}
            aria-expanded={expanded.fullTrace}
            aria-controls="full-trace"
          >
            View full trace
          </button>
          <div id="full-trace" className={`clinical-disclosure__body${expanded.fullTrace ? ' is-open' : ''}`}>
            <pre>{JSON.stringify(fullDecisionTrace, null, 2)}</pre>
          </div>
        </article>
      </section>

      <section className="landing-section landing-section--system-depth" aria-labelledby="system-depth-title">
        <header className="landing-section__header">
          <p className="landing-question">System scale and engineering depth</p>
          <h2 id="system-depth-title">System Depth &amp; Coverage</h2>
          <h3 className="system-depth-subtitle">
            Scope, coverage, and system capabilities underlying clinical decision generation.
          </h3>
        </header>

        <div className="system-depth-grid">
          <article className="system-depth-card">
            <h3>Dataset &amp; Evidence Scale</h3>
            <ul className="system-depth-metric-list">
              {systemDepthScale.map((item) => (
                <li key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </li>
              ))}
            </ul>
            <footer className="system-depth-card__footer">
              Derived from curated pharmacogenomic evidence and structured clinical mappings.
            </footer>
          </article>

          <article className="system-depth-card">
            <h3>Pharmacogenomic Coverage</h3>
            <div className="system-depth-group-stack">
              <section className="system-depth-group" aria-label="Supported genes">
                <h4>Genes</h4>
                <ul className="system-depth-token-list">
                  {systemDepthCoverage.genes.map((gene) => (
                    <li key={gene}>{gene}</li>
                  ))}
                </ul>
              </section>
              <section className="system-depth-group" aria-label="Drug classes">
                <h4>Drug Classes</h4>
                <ul className="system-depth-token-list">
                  {systemDepthCoverage.drugClasses.map((drugClass) => (
                    <li key={drugClass}>{drugClass}</li>
                  ))}
                </ul>
              </section>
              <section className="system-depth-group" aria-label="Guideline coverage">
                <h4>Guidelines</h4>
                <ul className="system-depth-metric-list system-depth-metric-list--compact">
                  {systemDepthCoverage.guidelines.map((item) => (
                    <li key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
            <footer className="system-depth-card__footer">
              Coverage aligned with clinically actionable pharmacogenes and drug classes.
            </footer>
          </article>

          <article className="system-depth-card">
            <h3>Diplotype &amp; Phenotype Engine</h3>
            <ul className="system-depth-metric-list system-depth-metric-list--single">
              <li>
                <span>Diplotype resolution</span>
                <strong>50+ allele combinations (CNV-aware)</strong>
              </li>
            </ul>
            <section className="system-depth-group" aria-label="Phenotype classes">
              <h4>Phenotype classes</h4>
              <ul className="system-depth-bullet-list">
                {systemDepthPhenotypes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
            <ul className="system-depth-mapping-list">
              <li>
                <span>Deterministic mapping</span>
                <strong>diplotype → phenotype</strong>
              </li>
            </ul>
            <footer className="system-depth-card__footer">Captures clinically relevant metabolic variability.</footer>
          </article>

          <article className="system-depth-card system-depth-card--architecture">
            <h3>Decision System Architecture</h3>
            <ol className="system-depth-pipeline" aria-label="Core decision pipeline">
              {systemDepthCorePipeline.map((item) => (
                <li key={item.stage}>
                  <span className="system-depth-pipeline__stage">{item.stage}</span>
                  <span className="system-depth-pipeline__detail">→ {item.detail}</span>
                </li>
              ))}
            </ol>

            <div className="system-depth-card__divider" aria-hidden="true" />

            <ol className="system-depth-pipeline system-depth-pipeline--safety" aria-label="Safety and reliability layers">
              {systemDepthSafetyPipeline.map((item) => (
                <li key={item.stage}>
                  <span className="system-depth-pipeline__stage">{item.stage}</span>
                  <span className="system-depth-pipeline__detail">→ {item.detail}</span>
                </li>
              ))}
            </ol>
            <footer className="system-depth-card__footer">
              Traceable, safety-aware, and reproducible clinical decision system.
            </footer>
          </article>
        </div>
      </section>

      <section className={`landing-section${spotlightClassFor('proof-block')}`} id="proof-block" aria-labelledby="proof-block-title">
        <header className="landing-section__header">
          <p className="landing-question">CONTRAST FRAMING</p>
          <h2 id="proof-block-title">What you are doing vs what is expected</h2>
          <p>This gap is where risk accumulates.</p>
        </header>

        <div className="proof-impact-strip" aria-label="Clinical impact signals">
          {proofImpactSignals.map((signal) => (
            <span key={signal}>{signal}</span>
          ))}
        </div>

        <div className="proof-contrast-layout" aria-label="Genotype-blind versus genotype-aware contrast">
          <article className="proof-contrast-card proof-contrast-card--blind">
            <h3>CURRENT PRACTICE</h3>
            <ul>
              {genotypeBlindRisks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="proof-contrast-card__result">
              <span>→ Result:</span>
              Toxicity risk, non-response, and inconsistent prescribing outcomes
            </p>
          </article>

          <p className="proof-contrast-divider">THIS GAP IS WHERE RISK ACCUMULATES</p>

          <article className="proof-contrast-card proof-contrast-card--aware">
            <h3>DEFENSIBLE PRACTICE</h3>
            <ul>
              {genotypeAwareCapabilities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="proof-contrast-card__result">
              <span>→ Result:</span>
              Reproducible, evidence-backed, clinically defensible decisions
            </p>
          </article>
        </div>
      </section>

      <section className={`landing-section${spotlightClassFor('trust-signals')}`} id="trust-signals" aria-labelledby="trust-signals-title">
        <header className="landing-section__header">
          <p className="landing-question">CLINICAL SAFETY GUARANTEES</p>
          <h2 id="trust-signals-title">Every PharmaKon recommendation is deterministic, traceable, and evidence-bound.</h2>
          <p>
            This system does not rely on assumptions.
            <br />
            It eliminates them.
          </p>
          <p className="trust-signals-constraint">If evidence is incomplete, the system does not proceed silently.</p>
        </header>
        <div className="trust-signals-grid trust-signals-grid--proof">
          {systemGuarantees.map((item, index) => (
            <article key={item.label} className={`trust-proof-block${index === systemGuarantees.length - 1 ? ' trust-proof-block--wide' : ''}`}>
              <p className="trust-proof-block__label">{item.label}</p>
              <h3>
                <span className="trust-proof-block__icon" aria-hidden="true">
                  {item.icon}
                </span>
                {item.headline}
              </h3>
              {item.lead ? <p className="trust-proof-block__lead">{item.lead}</p> : null}
              <ul>
                {item.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <p className="trust-proof-block__result">→ {item.result}</p>
            </article>
          ))}
        </div>

        <div className="trust-proof-final" aria-label="Clinical safety guarantee statement">
          <p>This is not a recommendation system.</p>
          <p>It is a deterministic clinical decision engine with full evidence accountability.</p>
        </div>
      </section>

      <section className="landing-section" id="claim-evidence" aria-labelledby="claim-evidence-title">
        <header className="landing-section__header">
          <p className="landing-question">EVIDENCE TRACEABILITY</p>
          <h2 id="claim-evidence-title">
            Every clinical output is backed by a verifiable chain — from variant detection to final recommendation.
          </h2>
        </header>

        <div className="evidence-trace-controls" role="group" aria-label="Evidence trace view mode">
          <button
            type="button"
            className={`evidence-trace-toggle${traceViewMode === 'simplified' ? ' is-active' : ''}`}
            onClick={() => setTraceViewMode('simplified')}
          >
            View simplified
          </button>
          <button
            type="button"
            className={`evidence-trace-toggle${traceViewMode === 'full' ? ' is-active' : ''}`}
            onClick={() => setTraceViewMode('full')}
          >
            View full trace
          </button>
        </div>

        <div className="evidence-trace-flow" aria-label="Traceable clinical reasoning pipeline">
          {evidenceTraceSteps.map((step, index) => (
            <div key={step.key} className="evidence-trace-node">
              <article
                className="evidence-trace-step"
                data-entry={step.animation}
                style={{ '--trace-delay': `${index * 160}ms` } as React.CSSProperties}
              >
                <h3>{step.title}</h3>
                <div className="evidence-trace-step__block">
                  <p className="evidence-trace-step__label">Claim:</p>
                  <p>{step.claim}</p>
                </div>
                <div className="evidence-trace-step__block">
                  <p className="evidence-trace-step__label">Evidence:</p>
                  <ul>
                    {step.evidence.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <p className="evidence-trace-step__tag">{step.tag}</p>

                {traceViewMode === 'full' ? (
                  <pre className="evidence-trace-step__trace">{JSON.stringify(step.tracePath, null, 2)}</pre>
                ) : null}
              </article>

              {index < evidenceTraceSteps.length - 1 ? (
                <span className="evidence-trace-connector" aria-hidden="true">
                  <span className="evidence-trace-connector__line" />
                  <span className="evidence-trace-connector__arrow">→</span>
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section" aria-labelledby="trust-layer-title">
        <header className="landing-section__header">
          <p className="landing-question">What makes this deployable and reviewable?</p>
          <h2 id="trust-layer-title">Trust Mechanisms</h2>
        </header>
        <div className="trust-grid">
          {trustMechanisms.map((item) => (
            <article key={item} className="trust-card">
              <p>{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="clinical-value" aria-labelledby="clinical-value-title">
        <header className="landing-section__header">
          <p className="landing-question">CLINICAL IMPACT THAT DIRECTLY AFFECTS OUTCOMES AND COST</p>
          <h2 id="clinical-value-title">This is not a clinical upgrade.</h2>
          <p>
            This is a financial and legal risk containment system.
            <br />
            <br />
            Every hospital already operates a pharmacogenomic risk surface.
            <br />
            Most just don’t see it.
            <br />
            <br />
            That risk shows up later as:
            <br />• treatment failure
            <br />• adverse events
            <br />• prolonged care cycles
            <br />• audit friction
          </p>
        </header>

        <div className="clinical-impact-strip" aria-label="Operational impact signals">
          {clinicalImpactSignals.map((signal) => (
            <span key={signal}>{signal}</span>
          ))}
        </div>

        <div className="value-grid">
          {clinicalValue.map((item) => (
            <article key={item.title} className={`value-card value-card--impact value-card--${item.tone}`}>
              <h3>
                <span className="value-card__icon" aria-hidden="true">
                  {item.icon}
                </span>
                {item.title}
              </h3>
              <p className="value-card__lead">{item.lead}</p>
              <ul>
                {item.bullets.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <p className="value-card__result">→ {item.result}</p>
            </article>
          ))}
        </div>

        <div className="clinical-impact-final" aria-label="Clinical impact conclusion">
          <p>You are already paying for this problem.</p>
          <p>The only question is:</p>
          <p>Do you want to see it before it happens — or after it becomes cost, escalation, or liability?</p>
        </div>
      </section>

      <section className="landing-section" id="decision-point" aria-labelledby="decision-point-title">
        <header className="landing-section__header">
          <h2 id="decision-point-title">Decision Point</h2>
        </header>
        <div className="clinical-impact-final">
          <p className="decision-point-line">You are already making these decisions.</p>
          <p className="decision-point-line">The only difference is:</p>
          <p className="decision-point-line">you cannot currently see the risk.</p>
          <p className="decision-point-line">So the question is:</p>
          <p className="decision-point-line">Do you want to see it before the decision —</p>
          <p className="decision-point-line">or defend it after?</p>
        </div>
        <div className="landing-hero-actions">
          <a className="topbar-cta" href="#sample-output">
            View Synthetic Analysis
          </a>
        </div>
        <p className="decision-point-subtext">Explore a synthetic research workflow. No clinical decision is generated.</p>
      </section>

      <div className="final-pressure-strip" role="note" aria-label="Genomic risk statement">
        Every hospital already operates with genomic risk. Most just don’t measure it.
      </div>

      <section className="landing-section landing-section--cta" aria-label="Primary conversion action">
        <div>
          <p className="landing-question">Explore the Pharmakon research prototype</p>
          <h2>Explore one synthetic prescribing scenario.</h2>
          <p>
            Takes one case to see the gap.
            <br />
            Used in simulated clinical audits.
          </p>
        </div>
        <div className="landing-hero-actions">
          <a className="topbar-cta" href="#audit-simulation">
            Explore Research Workflow
          </a>
          <a className="topbar-login" href="#sample-output">
            View Evidence Walkthrough
          </a>
          <Link className="topbar-tertiary" to="/upload">
            Open VCF Research Intake
          </Link>
        </div>
        <p className="decision-point-subtext" style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
          Research/demo intake only. Use synthetic or appropriately de-identified test data. This workflow does not provide clinical validation, prescribing recommendations, or treatment decisions.
        </p>
      </section>
    </main>
  );
}
