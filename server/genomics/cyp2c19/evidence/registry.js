/**
 * Multi-Gene Pharmacogenomic Evidence Registry & Ingestion Pipeline (Phase 3 & 4)
 * Supports CYP2C19, CYP2D6, and CYP2C9 variant normalization, PharmVar / ClinVar / ClinPGx
 * provenance tracking, and versioned CPIC evidence registry with deterministic rule mapping.
 *
 * STRICT BOUNDARIES: Research & engineering reference implementation.
 * Clinical recommendations and diplotype/phenotype prescribing remain strictly disabled (NO-GO).
 */

export const SUPPORTED_PHARMACOGENES = {
  CYP2C19: { gene: 'CYP2C19', chromosome: '10', defaultAccession: 'NC_000010.10', defaultBuild: 'GRCh37', supportsCnv: false },
  CYP2D6:  { gene: 'CYP2D6',  chromosome: '22', defaultAccession: 'NC_000022.10', defaultBuild: 'GRCh37', supportsCnv: true  },
  CYP2C9:  { gene: 'CYP2C9',  chromosome: '10', defaultAccession: 'NC_000010.10', defaultBuild: 'GRCh37', supportsCnv: false }
};

/**
 * Variant Normalization & Validation Utility (Phase 3)
 */
export function normalizeVariantRecord(rawRecord) {
  const gene = (rawRecord.gene || 'CYP2C19').toUpperCase();
  const chrom = String(rawRecord.chrom || rawRecord.chromosome || '').trim();
  const pos = String(rawRecord.pos || rawRecord.position || '').trim();
  const rsid = (rawRecord.rsid || '.').trim().toLowerCase();
  const ref = (rawRecord.ref || rawRecord.referenceAllele || '').trim().toUpperCase();
  const alt = (rawRecord.alt || rawRecord.variantAllele || '').trim().toUpperCase();
  const accession = (rawRecord.accession || rawRecord.referenceSequence || 'NC_000010.10').trim();
  const referenceBuild = (rawRecord.referenceBuild || 'GRCh37').trim();

  const isNormalized = Boolean(pos && ref && alt && ref !== '.' && alt !== '.');
  const normalizationFlags = [];

  if (!pos || pos === '0') {
    normalizationFlags.push('MISSING_POSITION');
  }
  if (!ref || ref === '.' || ref === 'N') {
    normalizationFlags.push('INVALID_REF_ALLELE');
  }
  if (!alt || alt === '.' || alt === 'N') {
    normalizationFlags.push('INVALID_ALT_ALLELE');
  }

  return {
    success: normalizationFlags.length === 0,
    normalizedVariant: {
      gene,
      chromosome: chrom,
      position: pos,
      rsid: rsid === 'null' ? '.' : rsid,
      referenceAllele: ref,
      variantAllele: alt,
      accession,
      referenceBuild,
      isNormalized,
      normalizationFlags,
      sourceProvenance: rawRecord.sourceProvenance || {
        sourceDb: 'PharmVar/ClinVar',
        version: 'v6.2.21',
        accessedAtIso: new Date().toISOString()
      }
    }
  };
}

/**
 * CYP2D6 Structural Variant / CNV Evidence Contract (Phase 3.5)
 */
export function evaluateCyp2d6StructuralEvidence(observation) {
  if (!observation || observation.gene !== 'CYP2D6') {
    return {
      supported: false,
      status: 'NOT_CYP2D6',
      reason: 'Observation is not a CYP2D6 record.'
    };
  }

  const copyNumber = observation.copyNumber !== undefined && observation.copyNumber !== null ? Number(observation.copyNumber) : 2;
  const hasHybridAllele = Boolean(observation.hasHybridAllele);
  const structuralType = (observation.structuralType || 'NORMAL').toUpperCase();

  let structuralStatus = 'NORMAL';
  if (structuralType === 'DELETION' || copyNumber < 2) {
    structuralStatus = 'GENE_DELETION';
  } else if (structuralType === 'DUPLICATION' || copyNumber > 2) {
    structuralStatus = 'GENE_DUPLICATION';
  } else if (structuralType === 'HYBRID' || hasHybridAllele) {
    structuralStatus = 'HYBRID_ALLELE';
  }

  return {
    supported: true,
    gene: 'CYP2D6',
    copyNumber,
    structuralType: structuralStatus,
    confidence: observation.confidence || 'HIGH',
    isClinicallyActionable: false,
    reason: `CYP2D6 structural evaluation completed: copy number ${copyNumber}, type ${structuralStatus}. Clinical prescribing disabled.`
  };
}

/**
 * Versioned Pharmacogenomic Evidence Registry & CPIC/ClinPGx Ingestion (Phase 4)
 */
export class PharmacogenomicEvidenceRegistry {
  constructor() {
    /** @type {Map<string, Object>} */
    this.guidelineRecords = new Map();
    /** @type {Map<string, Object>} */
    this.clinpgxAnnotations = new Map();
  }

  registerCpicGuideline(record) {
    const key = `${record.gene.toUpperCase()}::${record.drug.toUpperCase()}::${record.guidelineId || 'CPIC-DEFAULT'}`;
    const versionedRecord = {
      ...record,
      sourceDb: 'CPIC',
      schemaVersion: '2026.1',
      registeredAtIso: new Date().toISOString(),
      superseded: false
    };

    if (this.guidelineRecords.has(key)) {
      const existing = this.guidelineRecords.get(key);
      existing.superseded = true;
    }

    this.guidelineRecords.set(key, versionedRecord);
    return { success: true, key, record: versionedRecord };
  }

  registerClinpgxAnnotation(annotation) {
    const key = `${annotation.gene.toUpperCase()}::${annotation.drug.toUpperCase()}::${annotation.annotationId || 'CLINPGX-001'}`;
    const wrapped = {
      ...annotation,
      sourceDb: 'ClinPGx',
      registeredAtIso: new Date().toISOString()
    };
    this.clinpgxAnnotations.set(key, wrapped);
    return { success: true, key, annotation: wrapped };
  }

  queryEvidence(gene, drug, phenotype, clinicalContext = 'GENERAL') {
    const g = gene.toUpperCase();
    const d = drug.toUpperCase();
    const p = phenotype.toUpperCase();

    const matches = [];
    for (const [key, record] of this.guidelineRecords.entries()) {
      if (record.gene.toUpperCase() === g && record.drug.toUpperCase() === d && !record.superseded) {
        if (!record.phenotype || record.phenotype.toUpperCase() === p || record.phenotype === '*') {
          if (!record.clinicalContext || record.clinicalContext.toUpperCase() === clinicalContext.toUpperCase() || record.clinicalContext === 'GENERAL') {
            matches.push(record);
          }
        }
      }
    }

    return {
      success: true,
      query: { gene: g, drug: d, phenotype: p, clinicalContext },
      matchingGuidelinesCount: matches.length,
      guidelines: matches,
      clinicalGateStatus: 'NO-GO (Clinical recommendations disabled)'
    };
  }

  getStatistics() {
    return {
      activeGuidelinesCount: Array.from(this.guidelineRecords.values()).filter(r => !r.superseded).length,
      totalGuidelinesCount: this.guidelineRecords.size,
      clinpgxAnnotationsCount: this.clinpgxAnnotations.size,
      clinicalGate: 'DISABLED_FOR_PATIENT_CARE'
    };
  }
}

export const defaultEvidenceRegistry = new PharmacogenomicEvidenceRegistry();

defaultEvidenceRegistry.registerCpicGuideline({
  guidelineId: 'CPIC-CYP2C19-CLOPIDOGREL-V4',
  title: 'CPIC Guideline for CYP2C19 and Clopidogrel Therapy',
  gene: 'CYP2C19',
  drug: 'Clopidogrel',
  phenotype: 'POOR_METABOLIZER',
  recommendation: 'Use alternative antiplatelet therapy (e.g., prasugrel or ticagrelor) if not otherwise contraindicated.',
  recommendationStrength: 'Strong',
  clinicalContext: 'ACS_PCI',
  pmid: '35246295',
  doi: '10.1038/s41397-022-00271-x',
  sourceUrl: 'https://www.clinpgx.org/guidelines/CPIC/CYP2C19-clopidogrel',
  evidenceLevel: '1A'
});

defaultEvidenceRegistry.registerCpicGuideline({
  guidelineId: 'CPIC-CYP2C19-CLOPIDOGREL-V4',
  title: 'CPIC Guideline for CYP2C19 and Clopidogrel Therapy',
  gene: 'CYP2C19',
  drug: 'Clopidogrel',
  phenotype: 'RAPID_METABOLIZER',
  recommendation: 'Use standard dosing.',
  recommendationStrength: 'Moderate',
  clinicalContext: 'ACS_PCI',
  pmid: '35246295',
  doi: '10.1038/s41397-022-00271-x',
  sourceUrl: 'https://www.clinpgx.org/guidelines/CPIC/CYP2C19-clopidogrel',
  evidenceLevel: '1A'
});
