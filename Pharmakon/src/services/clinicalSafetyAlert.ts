import type {
  AiDraftOutput,
  ClinicalDrugComparisonRow,
  ClinicalPrescriptionAlert,
  ClinicalRiskClass,
  ClinicalPriority,
} from '../types/domain';

interface BuildClinicalAlertInput {
  output: AiDraftOutput | null;
  age?: string | number;
  weight?: string | number;
  organFunction?: string;
  currentMedications?: string[];
  clinicalNotes?: string;
}

const ALTERNATIVES_BY_DRUG: Record<string, string[]> = {
  clopidogrel: ['Ticagrelor', 'Prasugrel'],
  codeine: ['Morphine', 'Hydromorphone'],
  warfarin: ['Apixaban', 'Rivaroxaban'],
  simvastatin: ['Pravastatin', 'Rosuvastatin'],
  tacrolimus: ['Dose-adjusted Tacrolimus with TDM'],
};

const GUIDELINE_RULE_BY_DRUG: Record<string, string> = {
  clopidogrel: 'CYP2C19 loss-of-function antiplatelet response rule',
  codeine: 'CYP2D6 metabolism safety rule',
  warfarin: 'CYP2C9 dose sensitivity rule',
  simvastatin: 'SLCO1B1 statin myopathy risk rule',
  tacrolimus: 'CYP3A5 exposure adjustment rule',
};

function normalizeMedicationList(currentMedications: string[] | undefined, output: AiDraftOutput | null): string[] {
  const fromContext = (currentMedications ?? []).map((entry) => entry.trim()).filter(Boolean);
  if (fromContext.length > 0) {
    return fromContext;
  }

  const fromOutput = (output?.drug ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  return fromOutput.length > 0 ? fromOutput : ['Unknown Drug'];
}

function classifyRiskLevel(output: AiDraftOutput | null): ClinicalRiskClass {
  if (!output) {
    return 'Moderate';
  }

  const riskLabel = output.risk_assessment.risk_label.toLowerCase();
  if (riskLabel.includes('safe') || riskLabel.includes('no significant')) {
    return 'Low';
  }

  if (output.risk_assessment.severity === 'critical' || output.risk_assessment.severity === 'high') {
    return 'High';
  }

  return 'Moderate';
}

function headerForRisk(riskLevel: ClinicalRiskClass): string {
  if (riskLevel === 'High') {
    return '⚠️ HIGH-RISK PRESCRIPTION DETECTED';
  }

  if (riskLevel === 'Moderate') {
    return '⚠️ POTENTIAL RISK DETECTED';
  }

  return '✅ NO SIGNIFICANT GENETIC RISK DETECTED';
}

function impactForRisk(riskLevel: ClinicalRiskClass, phenotype: string): string[] {
  const normalizedPhenotype = phenotype.toLowerCase();

  if (riskLevel === 'Low') {
    return ['No immediate genotype-driven dosing hazard was detected for this prescription.'];
  }

  if (normalizedPhenotype.includes('poor') || normalizedPhenotype.includes('decreased')) {
    return [
      'This drug may accumulate due to reduced metabolism.',
      riskLevel === 'High' ? 'Risk of toxicity is significantly increased.' : 'Exposure drift is likely without dose adjustment.',
    ];
  }

  if (normalizedPhenotype.includes('ultrarapid') || normalizedPhenotype.includes('rapid')) {
    return [
      'Therapeutic effect may fail or become unstable due to accelerated metabolism.',
      riskLevel === 'High' ? 'Clinical harm risk is increased without immediate adjustment.' : 'Clinical response may be suboptimal without monitoring.',
    ];
  }

  return [
    'Drug response is likely altered by genotype-driven metabolism mismatch.',
    riskLevel === 'High' ? 'Risk of treatment harm is significantly increased.' : 'Risk of suboptimal dosing is elevated.',
  ];
}

function recommendationForRisk(
  riskLevel: ClinicalRiskClass,
  output: AiDraftOutput | null,
  primaryDrug: string,
): { action: string; priority: ClinicalPriority } {
  if (riskLevel === 'High') {
    return {
      action: output?.clinical_recommendation.action || `Avoid ${primaryDrug} now and switch to a safer option.`,
      priority: 'Immediate',
    };
  }

  if (riskLevel === 'Moderate') {
    return {
      action: output?.clinical_recommendation.action || `Reduce or adjust ${primaryDrug} dose and monitor response closely.`,
      priority: 'Caution',
    };
  }

  return {
    action: 'Proceed with standard dosing using routine clinical monitoring.',
    priority: 'Monitor',
  };
}

function alternativesForDrug(primaryDrug: string, riskLevel: ClinicalRiskClass): string {
  if (riskLevel === 'Low') {
    return 'None indicated';
  }

  const alternatives = ALTERNATIVES_BY_DRUG[primaryDrug.toLowerCase()];
  if (!alternatives || alternatives.length === 0) {
    return 'Use institution-approved non-interacting alternative';
  }

  return alternatives.join(', ');
}

function confidenceScore(output: AiDraftOutput | null): number {
  if (!output) {
    return 70;
  }

  const score = Math.round(output.risk_assessment.confidence_score * 100);
  return Math.max(0, Math.min(100, score));
}

function comparisonRiskForDrug(drug: string, primaryRisk: ClinicalRiskClass, primaryDrug: string): ClinicalRiskClass {
  if (drug.toLowerCase() === primaryDrug.toLowerCase()) {
    return primaryRisk;
  }

  const normalized = drug.toLowerCase();
  if (normalized.includes('codeine')) {
    return 'High';
  }

  if (normalized.includes('clopidogrel') || normalized.includes('warfarin') || normalized.includes('simvastatin') || normalized.includes('tacrolimus')) {
    return 'Moderate';
  }

  return 'Low';
}

function comparisonRecommendation(risk: ClinicalRiskClass, drug: string): string {
  if (risk === 'High') {
    return `Avoid ${drug}; switch immediately.`;
  }

  if (risk === 'Moderate') {
    return `Adjust ${drug} dose and monitor.`;
  }

  return `Standard ${drug} dosing acceptable.`;
}

function buildDrugComparison(
  medications: string[],
  primaryDrug: string,
  primaryRisk: ClinicalRiskClass,
): ClinicalDrugComparisonRow[] | undefined {
  if (medications.length <= 1) {
    return undefined;
  }

  return medications.map((drug) => {
    const risk = comparisonRiskForDrug(drug, primaryRisk, primaryDrug);
    return {
      drug,
      risk,
      recommendation: comparisonRecommendation(risk, drug),
    };
  });
}

export function buildClinicalPrescriptionAlert(input: BuildClinicalAlertInput): ClinicalPrescriptionAlert {
  const medications = normalizeMedicationList(input.currentMedications, input.output);
  const primaryDrug = medications[0] ?? 'Unknown Drug';
  const primaryGene = input.output?.pharmacogenomic_profile.primary_gene ?? 'Unknown gene';
  const phenotype = input.output?.pharmacogenomic_profile.phenotype ?? 'Unknown phenotype';
  const variantCount = input.output?.quality_metrics.variant_line_count ?? 0;
  const primaryVariant = input.output?.pharmacogenomic_profile.detected_variants[0];

  const riskLevel = classifyRiskLevel(input.output);
  const header = headerForRisk(riskLevel);
  const impact = impactForRisk(riskLevel, phenotype);
  const confidence = confidenceScore(input.output);
  const { action, priority } = recommendationForRisk(riskLevel, input.output, primaryDrug);
  const saferAlternatives = alternativesForDrug(primaryDrug, riskLevel);
  const rule = GUIDELINE_RULE_BY_DRUG[primaryDrug.toLowerCase()] ?? `${primaryGene} pharmacogenomic prescribing rule`;

  const missingData: string[] = [];
  if (!input.age) missingData.push('Age');
  if (!input.weight) missingData.push('Weight');
  if (!input.organFunction) missingData.push('Liver/Kidney function');
  if (!input.clinicalNotes) missingData.push('Clinical notes');

  const confidenceRisks = !input.output
    ? 'No parsed intake output available; fallback risk logic applied.'
    : !input.output.quality_metrics.vcf_parsing_success
      ? 'VCF parsing did not fully validate all variant records.'
      : variantCount < 5
        ? 'Low variant evidence volume may under-represent true risk.'
        : 'Non-genetic modifiers (organ function, interactions, adherence) may alter final risk.';

  const assumptions = [
    !input.organFunction ? 'Normal liver and kidney function assumed.' : '',
    medications.length <= 1 ? 'No interacting co-medications beyond listed primary drug.' : '',
    !input.age || !input.weight ? 'Adult dosing context assumed.' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const lowConfidence = confidence < 75;
  const highUncertainty =
    !input.output ||
    !input.output.quality_metrics.vcf_parsing_success ||
    missingData.length >= 3;
  const outOfDistribution = variantCount <= 0 || variantCount > 250000;
  const unsafe = lowConfidence || highUncertainty || outOfDistribution;

  const safeAction = unsafe
    ? 'Unsafe decision context detected (confidence/uncertainty/OOD). No recommendation issued. Escalate to clinician review and additional diagnostics.'
    : action;

  const unsafeReasoning = [
    lowConfidence ? 'Low confidence score detected.' : '',
    highUncertainty ? 'High uncertainty or missing critical context detected.' : '',
    outOfDistribution ? 'Input appears out-of-distribution for validated pipeline boundaries.' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    header: unsafe ? '⚠️ UNSAFE OUTPUT — NO RECOMMENDATION ISSUED' : header,
    impact,
    recommendedAction: safeAction,
    saferAlternatives,
    priority: unsafe ? 'Immediate' : priority,
    riskLevel,
    confidenceScore: confidence,
    primaryCause: `${primaryGene} ${phenotype}`,
    reasoningSteps: [
      `Variant detected: ${primaryVariant ? `${primaryVariant.rsid} (${primaryVariant.evidence})` : `${variantCount} variant records parsed`}.`,
      `Gene function affected: ${primaryGene} activity shifts expected drug handling.`,
      `Phenotype inferred: ${phenotype}.`,
      `Guideline rule triggered: ${rule}.`,
      `Risk classification result: ${riskLevel} risk for ${primaryDrug}.`,
      ...(unsafeReasoning ? [`Safety gate: ${unsafeReasoning}`] : []),
    ],
    uncertainty: {
      missingData: missingData.length > 0 ? missingData.join(', ') : 'None detected from provided context.',
      confidenceRisks,
      assumptions: assumptions || 'No extra assumptions required from provided input.',
    },
    safetyNote: unsafe
      ? 'Result marked unsafe. Recommendation withheld. Decision support only; escalate for clinician-led resolution.'
      : 'Decision support only. Final prescribing remains clinician-authorized.',
    drugComparison: buildDrugComparison(medications, primaryDrug, riskLevel),
  };
}
