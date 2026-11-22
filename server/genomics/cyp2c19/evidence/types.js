/**
 * Genotype Evidence Layer — Types & Contracts (Phase 2B.3A)
 * Explicit evidence states, readiness gate states, and evidence observation contracts.
 *
 * STRICT BOUNDARIES: Non-clinical engineering groundwork only. No clinical star-allele
 * assignment, diplotype resolution, phenotype translation, or prescribing decisions.
 */

/**
 * @readonly
 * @enum {string}
 */
export const EvidenceState = {
  OBSERVED_REFERENCE: 'OBSERVED_REFERENCE',     // Explicit 0/0 or 0|0 call
  OBSERVED_VARIANT: 'OBSERVED_VARIANT',         // Explicit alternate variant call (e.g. 0/1 or 1/1)
  NO_CALL: 'NO_CALL',                           // Explicit missing call (./. or .)
  NOT_IN_ASSAY: 'NOT_IN_ASSAY',                 // Marker absent from assay coverage manifest
  OUTSIDE_COVERAGE: 'OUTSIDE_COVERAGE',         // Position outside VCF record range or chromosome bounds
  LOW_QUALITY: 'LOW_QUALITY',                   // Failed explicit quality threshold configuration
  INVALID_INPUT: 'INVALID_INPUT',               // Malformed genotype, inconsistent alleles, or build mismatch
  UNKNOWN: 'UNKNOWN'                            // Unverified or uncharacterized state
};

/**
 * @readonly
 * @enum {string}
 */
export const ReadinessState = {
  READY_FOR_MATCHING: 'READY_FOR_MATCHING',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
  LOW_QUALITY: 'LOW_QUALITY',
  INVALID_INPUT: 'INVALID_INPUT',
  AMBIGUOUS_PHASE: 'AMBIGUOUS_PHASE'
};

/**
 * @typedef {Object} QualityConfig
 * @property {number} [minDepth] - Minimum read depth (DP) threshold if explicitly configured
 * @property {number} [minGenotypeQuality] - Minimum genotype quality (GQ) threshold if explicitly configured
 */

/**
 * @typedef {Object} GenotypeObservation
 * @property {string} rsid - Marker rsID (e.g. "rs4244285")
 * @property {string} position - 1-based chromosomal position
 * @property {string} chromosome - Chromosome (e.g. "10" or "chr10")
 * @property {string} accession - Reference sequence accession (e.g. "NC_000010.10")
 * @property {string} referenceBuild - Reference build (e.g. "GRCh37")
 * @property {string} sampleId - Sample identifier
 * @property {string} refAllele - Reference allele
 * @property {string} altAllele - Alternate allele(s)
 * @property {string} rawGt - Raw GT string
 * @property {number[]} alleles - Parsed numeric alleles
 * @property {boolean} isPhased - Phased status
 * @property {string|null} phaseSet - Phase set (PS)
 * @property {number|null} depth - Read depth (DP)
 * @property {number|null} genotypeQuality - Genotype quality (GQ)
 * @property {string} filterStatus - VCF filter status ("PASS" etc.)
 * @property {EvidenceState} evidenceState - Normalized evidence state
 * @property {string[]} validationWarnings - Non-fatal warnings
 * @property {string[]} validationErrors - Fatal validation errors
 */

/**
 * @typedef {Object} ReadinessReport
 * @property {ReadinessState} readinessStatus - Readiness gate evaluation result
 * @property {string[]} requiredMarkersAnalyzed - List of marker rsIDs checked
 * @property {string[]} readyMarkers - Markers meeting OBSERVED_REFERENCE or OBSERVED_VARIANT with passing quality/phase
 * @property {string[]} deficientMarkers - Markers in NO_CALL, OUTSIDE_COVERAGE, NOT_IN_ASSAY, LOW_QUALITY, or INVALID_INPUT
 * @property {boolean} hasPhaseAmbiguity - True if heterozygous markers lack consistent phase sets
 * @property {string[]} justificationNotes - Explicit reasons for readiness status
 */
