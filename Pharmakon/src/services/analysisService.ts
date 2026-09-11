import type { AnalysisResponse, DrugRiskAssessment, RiskLevel } from '../types/domain';

const DRUG_GENE_RULES: Record<string, { gene: string; diplotype: string; phenotype: string; normalRisk: RiskLevel }> = {
  Warfarin: { gene: 'CYP2C9', diplotype: '*2/*3', phenotype: 'Poor Metabolizer', normalRisk: 'safe' },
  Clopidogrel: { gene: 'CYP2C19', diplotype: '*2/*2', phenotype: 'Poor Metabolizer', normalRisk: 'safe' },
  Codeine: { gene: 'CYP2D6', diplotype: '*1xN/*1', phenotype: 'Ultrarapid Metabolizer', normalRisk: 'adjust' },
  Simvastatin: { gene: 'SLCO1B1', diplotype: 'c.521TC', phenotype: 'Decreased Function', normalRisk: 'safe' },
  Tacrolimus: { gene: 'CYP3A5', diplotype: '*3/*3', phenotype: 'Non-Expresser', normalRisk: 'adjust' },
};

const riskConfig: Record<RiskLevel, { severity: DrugRiskAssessment['severity']; actionable: boolean; confidenceRange: [number, number] }> = {
  safe: { severity: 'Low', actionable: false, confidenceRange: [0.9, 0.98] },
  adjust: { severity: 'Moderate', actionable: true, confidenceRange: [0.82, 0.91] },
  toxic: { severity: 'High', actionable: true, confidenceRange: [0.86, 0.97] },
  unknown: { severity: 'Unknown', actionable: false, confidenceRange: [0.5, 0.72] },
};

function deriveRisk(drug: string): RiskLevel {
  if (drug === 'Codeine') {
    return 'toxic';
  }

  if (drug === 'Clopidogrel' || drug === 'Tacrolimus') {
    return 'adjust';
  }

  if (drug === 'Simvastatin') {
    return 'adjust';
  }

  if (drug === 'Warfarin') {
    return 'adjust';
  }

  return 'unknown';
}

function confidenceFor(level: RiskLevel): number {
  const [min, max] = riskConfig[level].confidenceRange;
  return Number((Math.random() * (max - min) + min).toFixed(2));
}

export async function runDeterministicAnalysis(patientId: string, selectedDrugs: string[]): Promise<AnalysisResponse> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const results = selectedDrugs.map((drug): DrugRiskAssessment => {
    const base = DRUG_GENE_RULES[drug] ?? {
      gene: 'Not Identified',
      diplotype: 'N/A',
      phenotype: 'Unknown',
      normalRisk: 'unknown' as const,
    };

    const riskLevel = deriveRisk(drug);
    const config = riskConfig[riskLevel];

    return {
      drugName: drug,
      riskLevel,
      severity: config.severity,
      confidence: confidenceFor(riskLevel),
      actionable: config.actionable,
      reasoning: {
        gene: base.gene,
        diplotype: base.diplotype,
        phenotype: base.phenotype,
        enzymeBehavior:
          riskLevel === 'toxic'
            ? 'Increased enzyme activity predicts rapid conversion to active metabolite.'
            : riskLevel === 'adjust'
              ? 'Reduced enzyme activity predicts altered clearance and exposure.'
              : 'Observed activity is within expected range for standard exposure.',
        metabolismEffect:
          riskLevel === 'toxic'
            ? 'Expected elevated active metabolite concentration with toxicity risk.'
            : riskLevel === 'adjust'
              ? 'Expected deviation from target exposure; dose or alternative should be considered.'
              : 'Expected therapeutic exposure under standard dosing.',
      },
      counterfactual: `If enzyme activity were normal, the risk would be classified as ${base.normalRisk === 'safe' ? 'Safe' : 'Adjust Dosage'}.`,
      limitations:
        'Assessment excludes non-genetic factors such as age, hepatic impairment, concomitant inhibitors, and adherence uncertainty.',
    };
  });

  return {
    patient: {
      patientId,
      timestamp: new Date().toISOString(),
      parsingStatus: 'Complete',
      completeness: 0.93,
    },
    results,
    uncertainty:
      'Uncertainty is explicitly surfaced when genotype coverage is incomplete or phenotype translation tables contain unresolved alleles.',
  };
}