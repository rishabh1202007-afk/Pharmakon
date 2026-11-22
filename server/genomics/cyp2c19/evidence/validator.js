/**
 * Genotype Evidence Validator (Phase 2B.3A)
 * Validates normalized genotype observations against reference build, accession consistency,
 * allele representation, and quality configuration.
 */

import { EvidenceState } from './types.js';

/**
 * Validate normalized genotype observations.
 * @param {import('./types.js').GenotypeObservation[]} observations
 * @param {string} [expectedAccession='NC_000010.10']
 * @param {string} [expectedBuild='GRCh37']
 * @returns {{isValid: boolean, errors: string[], warnings: string[]}}
 */
export function validateGenotypeEvidence(observations, expectedAccession = 'NC_000010.10', expectedBuild = 'GRCh37') {
  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const warnings = [];

  if (!observations || observations.length === 0) {
    errors.push('No genotype observations supplied for evidence validation.');
    return { isValid: false, errors, warnings };
  }

  const seenPositions = new Set();

  for (const obs of observations) {
    if (obs.accession !== expectedAccession) {
      errors.push(`Accession mismatch for marker ${obs.rsid}: expected "${expectedAccession}", got "${obs.accession}".`);
      obs.evidenceState = EvidenceState.INVALID_INPUT;
    }

    if (obs.referenceBuild !== expectedBuild) {
      warnings.push(`Reference build mismatch for marker ${obs.rsid}: expected "${expectedBuild}", got "${obs.referenceBuild}".`);
    }

    const posKey = `${obs.chromosome}::${obs.position}`;
    if (seenPositions.has(posKey) && obs.evidenceState !== EvidenceState.OUTSIDE_COVERAGE) {
      warnings.push(`Duplicate observation detected for chromosomal position ${posKey} (marker ${obs.rsid}).`);
    }
    seenPositions.add(posKey);

    if (obs.validationErrors && obs.validationErrors.length > 0) {
      errors.push(...obs.validationErrors);
    }
    if (obs.validationWarnings && obs.validationWarnings.length > 0) {
      warnings.push(...obs.validationWarnings);
    }
  }

  const isValid = errors.length === 0;
  return { isValid, errors, warnings };
}
