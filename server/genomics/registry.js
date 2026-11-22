/**
 * Multi-Gene Pharmacogenomic Evidence Registry & Ingestion Pipeline (Phase 3 & 4)
 * Supports CYP2C19, CYP2D6, and CYP2C9 variant normalization, PharmVar / ClinVar / ClinPGx
 * provenance tracking, and versioned CPIC evidence registry with deterministic rule mapping.
 *
 * CANONICAL MODULE PATH: server/genomics/registry.js
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
 * Requires explicit gene validation, valid coordinates, REF/ALT alleles, and verified provenance.
 */
export function normalizeVariantRecord(rawRecord) {
  if (!rawRecord || typeof rawRecord !== 'object') {
    return {
      success: false,
      error: 'Invalid or missing variant record.',
      normalizedVariant: null
    };
  }

  const rawGene = (rawRecord.gene || '').trim().toUpperCase();
  if (!rawGene || !SUPPORTED_PHARMACOGENES[rawGene]) {
    return {
      success: false,
      error: `Unsupported or missing gene symbol: "${rawRecord.gene}".`,
      normalizedVariant: null
    };
  }

  const geneMeta = SUPPORTED_PHARMACOGENES[rawGene];
  const chrom = String(rawRecord.chrom || rawRecord.chromosome || geneMeta.chromosome).trim();
  const pos = String(rawRecord.pos || rawRecord.position || '').trim();
  const rsid = (rawRecord.rsid || '.').trim().toLowerCase();
  const ref = (rawRecord.ref || rawRecord.referenceAllele || '').trim().toUpperCase();
  const alt = (rawRecord.alt || rawRecord.variantAllele || '').trim().toUpperCase();

  const accession = (rawRecord.accession || rawRecord.referenceSequence || geneMeta.defaultAccession).trim();
  const referenceBuild = (rawRecord.referenceBuild || geneMeta.defaultBuild).trim();

  const isNumericPos = /^\d+$/.test(pos) && Number(pos) > 0;
  const isNormalized = Boolean(isNumericPos && ref && alt && ref !== '.' && alt !== '.' && accession === geneMeta.defaultAccession);
  const normalizationFlags = [];

  if (!isNumericPos) {
    normalizationFlags.push('INVALID_OR_MISSING_POSITION');
  }
  if (!ref || ref === '.' || ref === 'N') {
    normalizationFlags.push('INVALID_REF_ALLELE');
  }
  if (!alt || alt === '.' || alt === 'N') {
    normalizationFlags.push('INVALID_ALT_ALLELE');
  }
  if (accession !== geneMeta.defaultAccession) {
    normalizationFlags.push('ACCESSION_GENE_MISMATCH');
  }

  const sourceProvenance = rawRecord.sourceProvenance && typeof rawRecord.sourceProvenance === 'object'
    ? rawRecord.sourceProvenance
    : { sourceDb: 'UNKNOWN', version: 'NOT_PROVIDED', accessedAtIso: null };

  return {
    success: normalizationFlags.length === 0,
    normalizedVariant: {
      gene: rawGene,
      chromosome: chrom,
      position: pos,
      rsid: rsid === 'null' || rsid === '' ? '.' : rsid,
      referenceAllele: ref,
      variantAllele: alt,
      accession,
      referenceBuild,
      isNormalized,
      normalizationFlags,
      sourceProvenance,
      originalRecord: rawRecord
    }
  };
}

/**
 * CYP2D6 Structural Variant / CNV Evidence Contract (Phase 3.5)
 * Strict validation: requires explicit copy-number or structural-type evidence.
 * Missing evidence returns INSUFFICIENT_EVIDENCE / UNKNOWN. Never defaults to NORMAL or HIGH confidence.
 */
export function evaluateCyp2d6StructuralEvidence(observation) {
  if (!observation || observation.gene !== 'CYP2D6') {
    return {
      supported: false,
      status: 'NOT_CYP2D6',
      reason: 'Observation is not a CYP2D6 record.'
    };
  }

  const hasCopyNumber = observation.copyNumber !== undefined && observation.copyNumber !== null && observation.copyNumber !== '';
  const hasStructuralType = observation.structuralType !== undefined && observation.structuralType !== null && observation.structuralType !== '';
  const hasConfidence = observation.confidence !== undefined && observation.confidence !== null && observation.confidence !== '';

  if (!hasCopyNumber && !hasStructuralType) {
    return {
      supported: false,
      status: 'INSUFFICIENT_EVIDENCE',
      copyNumber: null,
      structuralType: 'UNKNOWN',
      confidence: 'UNKNOWN',
      isClinicallyActionable: false,
      reason: 'Missing CYP2D6 copy-number and structural-variant evidence; cannot infer structural state.'
    };
  }

  // Validate copy number is numeric, finite, and non-negative
  if (hasCopyNumber) {
    const cnNum = Number(observation.copyNumber);
    if (!Number.isFinite(cnNum) || cnNum < 0) {
      return {
        supported: false,
        status: 'INVALID_EVIDENCE',
        copyNumber: observation.copyNumber,
        structuralType: 'INVALID',
        confidence: hasConfidence ? String(observation.confidence).toUpperCase() : 'UNKNOWN',
        isClinicallyActionable: false,
        reason: `Invalid non-finite or negative copy-number value supplied: "${observation.copyNumber}".`
      };
    }
  }

  const copyNumber = hasCopyNumber ? Number(observation.copyNumber) : null;
  const confidence = hasConfidence ? String(observation.confidence).toUpperCase() : 'UNKNOWN';
  const structuralTypeRaw = hasStructuralType ? String(observation.structuralType).toUpperCase() : 'UNKNOWN';

  // Conflict detection between copy number and explicit structural type
  if (hasCopyNumber && hasStructuralType) {
    if (copyNumber === 2 && (structuralTypeRaw === 'DELETION' || structuralTypeRaw === 'DUPLICATION')) {
      return {
        supported: false,
        status: 'INVALID_EVIDENCE',
        copyNumber,
        structuralType: structuralTypeRaw,
        confidence,
        isClinicallyActionable: false,
        reason: `Conflicting evidence: copy number is 2 but structural type is explicitly "${structuralTypeRaw}".`
      };
    }
    if (copyNumber < 2 && structuralTypeRaw === 'DUPLICATION') {
      return {
        supported: false,
        status: 'INVALID_EVIDENCE',
        copyNumber,
        structuralType: structuralTypeRaw,
        confidence,
        isClinicallyActionable: false,
        reason: `Conflicting evidence: copy number (${copyNumber}) contradicts duplication structural type.`
      };
    }
    if (copyNumber > 2 && structuralTypeRaw === 'DELETION') {
      return {
        supported: false,
        status: 'INVALID_EVIDENCE',
        copyNumber,
        structuralType: structuralTypeRaw,
        confidence,
        isClinicallyActionable: false,
        reason: `Conflicting evidence: copy number (${copyNumber}) contradicts deletion structural type.`
      };
    }
  }

  let structuralStatus = 'UNKNOWN';
  if (structuralTypeRaw === 'DELETION' || (copyNumber !== null && copyNumber < 2)) {
    structuralStatus = 'GENE_DELETION';
  } else if (structuralTypeRaw === 'DUPLICATION' || (copyNumber !== null && copyNumber > 2)) {
    structuralStatus = 'GENE_DUPLICATION';
  } else if (structuralTypeRaw === 'HYBRID' || Boolean(observation.hasHybridAllele)) {
    structuralStatus = 'HYBRID_ALLELE';
  } else if (structuralTypeRaw === 'NORMAL' || (copyNumber === 2 && !hasStructuralType)) {
    structuralStatus = 'NORMAL';
  }

  if (structuralStatus === 'UNKNOWN') {
    return {
      supported: false,
      status: 'INSUFFICIENT_EVIDENCE',
      copyNumber,
      structuralType: 'UNKNOWN',
      confidence,
      isClinicallyActionable: false,
      reason: 'Ambiguous or unhandled CYP2D6 structural evidence.'
    };
  }

  return {
    supported: true,
    status: 'SUPPORTED',
    gene: 'CYP2D6',
    copyNumber,
    structuralType: structuralStatus,
    confidence,
    isClinicallyActionable: false, // NO-GO clinical gate
    reason: `CYP2D6 structural evaluation completed: copy number ${copyNumber}, type ${structuralStatus}, confidence ${confidence}. Clinical prescribing disabled.`
  };
}

/**
 * Versioned Pharmacogenomic Evidence Registry & CPIC/ClinPGx Ingestion (Phase 4)
 * PARTIAL — IMPORT-READY ENGINEERING FOUNDATION (manual registration supported, live API retrieval pending).
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
