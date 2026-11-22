/**
 * Genotype Evidence Readiness Gate (Phase 2B.3A)
 * Evaluates normalized genotype observations to determine readiness for future haplotype matching.
 */

import { EvidenceState, ReadinessState } from './types.js';
import { CYP2C19_MVP_MARKERS } from '../types.js';

/**
 * Evaluate evidence readiness for haplotype matching.
 * @param {import('./types.js').GenotypeObservation[]} observations
 * @returns {import('./types.js').ReadinessReport}
 */
export function evaluateEvidenceReadiness(observations) {
  const requiredMarkers = CYP2C19_MVP_MARKERS.map(m => m.rsid);
  /** @type {string[]} */
  const readyMarkers = [];
  /** @type {string[]} */
  const deficientMarkers = [];
  /** @type {string[]} */
  const justificationNotes = [];

  if (!observations || observations.length === 0) {
    return {
      readinessStatus: ReadinessState.INSUFFICIENT_EVIDENCE,
      requiredMarkersAnalyzed: requiredMarkers,
      readyMarkers: [],
      deficientMarkers: requiredMarkers,
      hasPhaseAmbiguity: false,
      justificationNotes: ['No observations provided to readiness gate.']
    };
  }

  let hasInvalidInput = false;
  let hasLowQuality = false;
  let hasMissingOrAbsent = false;
  let unphasedHeterozygousCount = 0;
  const phaseSetsSeen = new Set();

  for (const markerRsid of requiredMarkers) {
    const obs = observations.find(o => o.rsid.toLowerCase() === markerRsid.toLowerCase());

    if (!obs) {
      deficientMarkers.push(markerRsid);
      hasMissingOrAbsent = true;
      justificationNotes.push(`Marker ${markerRsid} is entirely absent from observations.`);
      continue;
    }

    if (obs.evidenceState === EvidenceState.OBSERVED_REFERENCE || obs.evidenceState === EvidenceState.OBSERVED_VARIANT) {
      readyMarkers.push(markerRsid);

      // Check phase status for heterozygous calls
      const isHeterozygous = obs.alleles.length === 2 && obs.alleles[0] !== obs.alleles[1] && !obs.alleles.includes(-1);
      if (isHeterozygous) {
        if (!obs.isPhased) {
          unphasedHeterozygousCount++;
          justificationNotes.push(`Heterozygous call at marker ${markerRsid} is unphased.`);
        } else if (obs.phaseSet) {
          phaseSetsSeen.add(obs.phaseSet);
        }
      }
    } else if (obs.evidenceState === EvidenceState.LOW_QUALITY) {
      deficientMarkers.push(markerRsid);
      hasLowQuality = true;
      justificationNotes.push(`Marker ${markerRsid} failed quality evaluation (LOW_QUALITY).`);
    } else if (obs.evidenceState === EvidenceState.INVALID_INPUT) {
      deficientMarkers.push(markerRsid);
      hasInvalidInput = true;
      justificationNotes.push(`Marker ${markerRsid} contains invalid input data (INVALID_INPUT).`);
    } else {
      // NO_CALL, OUTSIDE_COVERAGE, NOT_IN_ASSAY, UNKNOWN
      deficientMarkers.push(markerRsid);
      hasMissingOrAbsent = true;
      justificationNotes.push(`Marker ${markerRsid} is uncalled or outside coverage (${obs.evidenceState}).`);
    }
  }

  // Determine readiness status
  let readinessStatus = ReadinessState.READY_FOR_MATCHING;
  let hasPhaseAmbiguity = false;

  if (hasInvalidInput) {
    readinessStatus = ReadinessState.INVALID_INPUT;
  } else if (hasLowQuality && readyMarkers.length === 0) {
    readinessStatus = ReadinessState.LOW_QUALITY;
  } else if (hasMissingOrAbsent || readyMarkers.length < Math.ceil(requiredMarkers.length / 2)) {
    readinessStatus = ReadinessState.INSUFFICIENT_EVIDENCE;
  } else if (unphasedHeterozygousCount > 1 || phaseSetsSeen.size > 1) {
    hasPhaseAmbiguity = true;
    readinessStatus = ReadinessState.AMBIGUOUS_PHASE;
    justificationNotes.push('Multiple or conflicting phase sets / unphased heterozygous calls create phase ambiguity.');
  }

  if (readinessStatus === ReadinessState.READY_FOR_MATCHING) {
    justificationNotes.unshift('Sufficient marker observations present with valid quality and phase consistency.');
  }

  return {
    readinessStatus,
    requiredMarkersAnalyzed: requiredMarkers,
    readyMarkers,
    deficientMarkers,
    hasPhaseAmbiguity,
    justificationNotes
  };
}
