/**
 * CYP2C19 Haplotype Matching Prototype — Types & Contracts (Phase 2B.3B)
 * Contracts for synthetic evidence-to-haplotype candidate matching.
 *
 * STRICT BOUNDARIES: Engineering-only synthetic prototype. No clinical diplotype
 * or phenotype assignments, CPIC recommendations, or prescribing logic.
 */

/**
 * @typedef {Object} MatchCandidate
 * @property {string} haplotypeId - Candidate haplotype identifier (e.g. "CYP2C19*2.001" or "CYP2C19*1")
 * @property {string} coreAllele - Core star allele name (e.g. "CYP2C19*2")
 * @property {string} referenceSequence - Reference sequence accession (e.g. "NC_000010.10")
 * @property {number} matchingVariantCount - Number of variants matching evidence observations
 * @property {number} totalDefiningVariantCount - Total defining variants for this haplotype
 * @property {number} mismatchCount - Number of conflicting variant observations
 * @property {number} missingCount - Number of defining variants with missing/absent evidence
 * @property {number} confidenceScore - Computed technical match score (0.0 to 1.0)
 * @property {string[]} matchReasons - Technical reasons supporting this candidate match
 * @property {string[]} mismatchReasons - Technical reasons or conflicts against this candidate match
 */

/**
 * @typedef {Object} MatchingResult
 * @property {boolean} success - True if matching evaluation completed successfully
 * @property {string} status - "CANDIDATES_IDENTIFIED" | "INSUFFICIENT_EVIDENCE" | "AMBIGUOUS_EVIDENCE" | "ASSEMBLY_MISMATCH" | "ACCESSION_MISMATCH" | "INVALID_EVIDENCE"
 * @property {string} pharmvarVersion - "6.2.21 (local repository; v6.2.29 unimported)"
 * @property {MatchCandidate[]} candidates - Ranked list of candidate haplotype matches
 * @property {string[]} uncertaintyReasons - Explicit technical reasons for ambiguity or incomplete matching
 * @property {Object} provenance - Processing timestamp and version provenance
 */
