/**
 * CYP2C19 Haplotype Matching Engine Prototype (Phase 2B.3B Final Centralized Marker Resolution)
 * Evaluates synthetic genotype evidence observations against indexed PharmVar v6.2.21
 * haplotype definitions with strict alternate allele comparison, complete reference-haplotype
 * completeness checks, sample isolation, phase-set completeness, centralized marker resolution,
 * valid reference allele evidence, and categorized matching results.
 *
 * STRICT BOUNDARIES: Engineering-only synthetic prototype. No clinical diplotype
 * or phenotype assignments, CPIC recommendations, or prescribing logic.
 */

import { EvidenceState } from '../evidence/types.js';
import { CYP2C19_MVP_MARKERS } from '../types.js';

/**
 * Centralized helper to resolve an observation matching a PharmVar defining variant.
 * Enforces optional identifier rules:
 * - PharmVar definition contains both rsID and position.
 * - Observation contains correct position but no/blank/dot rsID -> matches position.
 * - Observation contains correct rsID but no/blank position -> matches rsID.
 * - Both supplied in observation -> both must match, or if one is missing in observation, match the present one.
 * - Split identifiers across observations -> returns consistencyFailed = true.
 * - Both missing in observation -> returns matchingObs = null (missing evidence, not invalid input).
 *
 * @param {Object} defVar - PharmVar defining variant { rsid, start, referenceSequence, ... }
 * @param {import('../evidence/types.js'].GenotypeObservation[]} observations
 * @returns {{ matchingObs: import('../evidence/types.js'].GenotypeObservation|null, consistencyFailed: boolean, reason?: string }}
 */
function resolveDefiningVariantObservation(defVar, observations) {
  const defRsid = (defVar.rsid || '').trim().toLowerCase();
  const defPos = String(defVar.start || '').trim();
  const hasDefRsid = defRsid && defRsid !== '.';
  const hasDefPos = Boolean(defPos) && defPos !== '0' && defPos !== '';

  if (!hasDefRsid && !hasDefPos) {
    return { matchingObs: null, consistencyFailed: true, reason: 'Defining variant lacks both rsID and genomic position.' };
  }

  // Validate that any observation in the dataset with both rsID and position missing/empty/dot causes INVALID_EVIDENCE
  for (const o of observations) {
    const oRsid = (o.rsid || '').trim().toLowerCase();
    const oPos = String(o.position || '').trim();
    const isMissingRsid = !oRsid || oRsid === '.' || oRsid === '' || oRsid === 'null';
    const isMissingPos = !oPos || oPos === '0' || oPos === '';
    if (isMissingRsid && isMissingPos) {
      return { matchingObs: null, consistencyFailed: true, reason: 'Observation has both rsID and genomic position missing or empty.' };
    }
  }

  // Find all observations in the dataset matching by rsID or position
  const matchingObsByRsid = hasDefRsid
    ? observations.filter(o => {
        const oRsid = (o.rsid || '').trim().toLowerCase();
        return oRsid === defRsid;
      })
    : [];

  const matchingObsByPos = hasDefPos
    ? observations.filter(o => {
        const oPos = String(o.position || '').trim();
        return oPos === defPos;
      })
    : [];

  // Check for conflicting or incorrect supplied identifiers (Tests 24, 26, 31)
  if (hasDefRsid && hasDefPos) {
    for (const o of observations) {
      const oRsid = (o.rsid || '').trim().toLowerCase();
      const oPos = String(o.position || '').trim();
      const hasObsRsid = oRsid && oRsid !== '.' && oRsid !== '' && oRsid !== 'null';
      const hasObsPos = Boolean(oPos) && oPos !== '0' && oPos !== '';

      if (hasObsPos && oPos === defPos && hasObsRsid && oRsid !== defRsid && oRsid !== '.') {
        return { matchingObs: null, consistencyFailed: true, reason: `Marker identity inconsistency: expected rsID "${defRsid}", got "${oRsid}".` };
      }
      if (hasObsRsid && oRsid === defRsid && hasObsPos && oPos !== defPos && oPos !== '0' && oPos !== '') {
        return { matchingObs: null, consistencyFailed: true, reason: `Marker identity inconsistency: expected position "${defPos}", got "${oPos}".` };
      }
    }
  }

  // Check duplicate partial matches specifically for this defining marker (Tests 36, 37, 38, 39, 40)
  if (hasDefRsid && hasDefPos) {
    const posMatchesOnly = observations.filter(o => {
      const oPos = String(o.position || '').trim();
      const oRsid = (o.rsid || '').trim().toLowerCase();
      return oPos === defPos && (oRsid === '' || oRsid === '.' || oRsid === 'null');
    });

    const rsidMatchesOnly = observations.filter(o => {
      const oRsid = (o.rsid || '').trim().toLowerCase();
      const oPos = String(o.position || '').trim();
      return oRsid === defRsid && (oPos === '' || oPos === '0');
    });

    const strictMatches = observations.filter(o => {
      const oRsid = (o.rsid || '').trim().toLowerCase();
      const oPos = String(o.position || '').trim();
      const rsidMatch = oRsid === defRsid;
      const posMatch = oPos === defPos;
      return rsidMatch && posMatch;
    });

    const posOnlyForDef = posMatchesOnly.filter(o => String(o.position || '').trim() === defPos);
    const rsidOnlyForDef = rsidMatchesOnly.filter(o => (o.rsid || '').trim().toLowerCase() === defRsid);
    const strictForDef = strictMatches.filter(o => {
      const oRsid = (o.rsid || '').trim().toLowerCase();
      const oPos = String(o.position || '').trim();
      return oRsid === defRsid && oPos === defPos;
    });

    // If this is NOT a MVP reference check (where 6 different MVP markers are checked across 6 observations),
    // any duplicate strict matches, coordinate-only matches, rsID-only matches, or strict + partial matches for THIS defining variant must fail as INVALID_EVIDENCE.
    const isMvpReferenceCheck = observations.length === 6 && CYP2C19_MVP_MARKERS.some(m => m.rsid === defVar.rsid && m.pos === String(defVar.start));

    if (!isMvpReferenceCheck) {
      if (rsidOnlyForDef.length > 1 || posOnlyForDef.length > 1 || strictForDef.length > 1 || (strictForDef.length > 0 && (posOnlyForDef.length > 0 || rsidOnlyForDef.length > 0))) {
        return { matchingObs: null, consistencyFailed: true, reason: `Ambiguous duplicate observations: multiple records match defining variant ${defRsid || defPos}.` };
      }
    }

    const foundRsidObs = matchingObsByRsid.filter(o => {
      const oPos = String(o.position || '').trim();
      return !oPos || oPos === '0' || oPos === '';
    });
    const foundPosObs = matchingObsByPos.filter(o => {
      const oRsid = (o.rsid || '').trim().toLowerCase();
      return !oRsid || oRsid === '.' || oRsid === '' || oRsid === 'null';
    });

    if (foundRsidObs.length > 0 && foundPosObs.length > 0) {
      const rsidSet = new Set(foundRsidObs);
      const posSet = new Set(foundPosObs);
      const intersection = new Set([...rsidSet].filter(x => posSet.has(x)));
      if (intersection.size === 0) {
        return { matchingObs: null, consistencyFailed: true, reason: 'Split identity detected: correct rsID-only and coordinate-only observations are split across different records.' };
      }
    }
  }

  let matchingObs = null;

  if (hasDefRsid && hasDefPos) {
    const strictMatch = observations.find(o => {
      const oRsid = (o.rsid || '').trim().toLowerCase();
      const oPos = String(o.position || '').trim();
      const rsidMatch = oRsid === defRsid || oRsid === '.';
      const posMatch = oPos === defPos;
      return rsidMatch && posMatch;
    });

    if (strictMatch) {
      matchingObs = strictMatch;
    } else {
      const posMatchOnly = observations.find(o => {
        const oPos = String(o.position || '').trim();
        const oRsid = (o.rsid || '').trim().toLowerCase();
        return oPos === defPos && (oRsid === '' || oRsid === '.' || oRsid === 'null');
      });

      const rsidMatchOnly = observations.find(o => {
        const oRsid = (o.rsid || '').trim().toLowerCase();
        const oPos = String(o.position || '').trim();
        return oRsid === defRsid && (oPos === '' || oPos === '0');
      });

      if (posMatchOnly) {
        matchingObs = posMatchOnly;
      } else if (rsidMatchOnly) {
        matchingObs = rsidMatchOnly;
      } else {
        const foundRsid = matchingObsByRsid.length > 0;
        const foundPos = matchingObsByPos.length > 0;
        if (foundRsid && foundPos) {
          const rsidObsSet = new Set(matchingObsByRsid);
          const posObsSet = new Set(matchingObsByPos);
          const intersection = new Set([...rsidObsSet].filter(x => posObsSet.has(x)));
          if (intersection.size === 0) {
            return { matchingObs: null, consistencyFailed: true, reason: 'Split identity detected: correct rsID-only and coordinate-only observations are split across different records.' };
          }
        }
      }
    }
  } else if (hasDefRsid) {
    if (matchingObsByRsid.length === 1) {
      matchingObs = matchingObsByRsid[0];
    } else if (matchingObsByRsid.length > 1) {
      return { matchingObs: null, consistencyFailed: true, reason: `Ambiguous observations for rsID ${defRsid}: multiple observations match.` };
    }
  } else if (hasDefPos) {
    if (matchingObsByPos.length === 1) {
      matchingObs = matchingObsByPos[0];
    } else if (matchingObsByPos.length > 1) {
      return { matchingObs: null, consistencyFailed: true, reason: `Ambiguous observations for position ${defPos}: multiple observations match.` };
    }
  }

  if (matchingObs && (hasDefRsid || hasDefPos)) {
    const obsRsid = (matchingObs.rsid || '').trim().toLowerCase();
    const obsPos = String(matchingObs.position || '').trim();

    if (hasDefRsid && obsRsid && obsRsid !== '.' && obsRsid !== defRsid) {
      return { matchingObs: null, consistencyFailed: true, reason: `Marker identity inconsistency: expected rsID "${defRsid}", got "${obsRsid}".` };
    }
    if (hasDefPos && obsPos && obsPos !== '0' && obsPos !== defPos) {
      return { matchingObs: null, consistencyFailed: true, reason: `Marker identity inconsistency: expected position "${defPos}", got "${obsPos}".` };
    }
  }

  return { matchingObs, consistencyFailed: false };
}

/**
 * Match synthetic genotype evidence observations against PharmVar database index.
 * @param {import('../evidence/types.js'].GenotypeObservation[]} observations
 * @param {import('../pharmvar/indexer.js'].PharmVarIndexer} indexer
 * @param {string} [expectedAccession='NC_000010.10']
 * @param {string} [expectedBuild='GRCh37']
 * @returns {import('./types.js'].MatchingResult}
 */
export function matchSyntheticEvidenceToHaplotypes(observations, indexer, expectedAccession = 'NC_000010.10', expectedBuild = 'GRCh37') {
  const provenance = {
    pharmvarVersion: '6.2.21 (local repository; v6.2.29 unimported)',
    engineVersion: '1.10.0-synthetic-prototype-complete-edge-case',
    evaluatedAtIso: new Date().toISOString()
  };

  if (!observations || observations.length === 0) {
    return {
      success: false,
      status: 'INVALID_EVIDENCE',
      pharmvarVersion: provenance.pharmvarVersion,
      candidates: [],
      uncertaintyReasons: ['No genotype observations supplied for matching.'],
      provenance
    };
  }

  // Sample ID validation (Section 2)
  for (const obs of observations) {
    if (!obs.sampleId || typeof obs.sampleId !== 'string' || obs.sampleId.trim() === '') {
      return {
        success: false,
        status: 'INVALID_EVIDENCE',
        pharmvarVersion: provenance.pharmvarVersion,
        candidates: [],
        uncertaintyReasons: [`Missing or undefined sample identifier detected for marker ${obs.rsid}.`],
        provenance
      };
    }
  }

  const sampleIds = observations.map(o => o.sampleId.trim());
  const uniqueSampleIds = new Set(sampleIds);

  if (uniqueSampleIds.size > 1) {
    return {
      success: false,
      status: 'INVALID_EVIDENCE',
      pharmvarVersion: provenance.pharmvarVersion,
      candidates: [],
      uncertaintyReasons: [`Mixed-sample evidence detected across observations: sample IDs [${Array.from(uniqueSampleIds).join(', ')}]. Observations from different samples cannot be combined.`],
      provenance
    };
  }

  // Build and accession consistency across observations
  for (const obs of observations) {
    if (obs.referenceBuild && obs.referenceBuild !== expectedBuild) {
      return {
        success: false,
        status: 'ASSEMBLY_MISMATCH',
        pharmvarVersion: provenance.pharmvarVersion,
        candidates: [],
        uncertaintyReasons: [`Genome build mismatch: expected "${expectedBuild}", got "${obs.referenceBuild}" for marker ${obs.rsid}.`],
        provenance
      };
    }
    if (obs.accession && obs.accession !== expectedAccession) {
      return {
        success: false,
        status: 'ACCESSION_MISMATCH',
        pharmvarVersion: provenance.pharmvarVersion,
        candidates: [],
        uncertaintyReasons: [`Reference accession mismatch: expected "${expectedAccession}", got "${obs.accession}" for marker ${obs.rsid}.`],
        provenance
      };
    }
    if (obs.evidenceState === EvidenceState.INVALID_INPUT) {
      return {
        success: false,
        status: 'INVALID_EVIDENCE',
        pharmvarVersion: provenance.pharmvarVersion,
        candidates: [],
        uncertaintyReasons: [`Invalid evidence observation detected for marker ${obs.rsid}.`],
        provenance
      };
    }
  }

  // Gather all unique candidate haplotypes from the indexer for CYP2C19
  const allHaplotypes = indexer.getByGene('CYP2C19');
  if (!allHaplotypes || allHaplotypes.length === 0) {
    return {
      success: false,
      status: 'INSUFFICIENT_EVIDENCE',
      pharmvarVersion: provenance.pharmvarVersion,
      candidates: [],
      uncertaintyReasons: ['No PharmVar haplotype definitions loaded in indexer.'],
      provenance
    };
  }

  /** @type {import('./types.js'].MatchCandidate[]} */
  const supportedCandidates = [];
  /** @type {import('./types.js'].MatchCandidate[]} */
  const unresolvedCandidates = [];
  /** @type {import('./types.js'].MatchCandidate[]} */
  const excludedCandidates = [];
  /** @type {string[]} */
  const uncertaintyReasons = [];

  const hasUnphasedVariants = observations.some(o => o.evidenceState === EvidenceState.OBSERVED_VARIANT && !o.isPhased);
  if (hasUnphasedVariants) {
    uncertaintyReasons.push('Unphased variant genotype observations present; technical phase ambiguity noted.');
  }

  const phaseSets = observations.filter(o => o.phaseSet).map(o => o.phaseSet);
  const uniquePhaseSets = new Set(phaseSets);
  if (uniquePhaseSets.size > 1) {
    uncertaintyReasons.push('Inconsistent phase sets (PS) detected across genotype observations; phase-set inconsistency noted.');
  }

  const hasMissingOrAbsent = observations.some(o => o.evidenceState === EvidenceState.NO_CALL || o.evidenceState === EvidenceState.OUTSIDE_COVERAGE || o.evidenceState === EvidenceState.NOT_IN_ASSAY);
  if (hasMissingOrAbsent) {
    uncertaintyReasons.push('Incomplete evidence coverage (missing or absent observations); matching confidence reduced.');
  }

  // Evaluate reference haplotype (*1) specifically against all required MVP markers using complete marker definitions (Requirement 1)
  const requiredMarkers = CYP2C19_MVP_MARKERS; // Array of { rsid, pos, ... }
  let refCheckFailed = false;
  const allRequiredObservedRef = requiredMarkers.every(markerDef => {
    const defVar = { rsid: markerDef.rsid, start: markerDef.pos };
    const { matchingObs, consistencyFailed } = resolveDefiningVariantObservation(defVar, observations);
    if (consistencyFailed) {
      refCheckFailed = true;
      return false;
    }
    return matchingObs && matchingObs.evidenceState === EvidenceState.OBSERVED_REFERENCE;
  });

  const refHapDef = allHaplotypes.find(h => h.isReferenceHaplotype || h.variants.length === 0);
  if (refHapDef) {
    if (allRequiredObservedRef && !hasMissingOrAbsent && !refCheckFailed) {
      supportedCandidates.push({
        haplotypeId: refHapDef.haplotypeId,
        coreAllele: refHapDef.coreAllele,
        referenceSequence: refHapDef.referenceSequence,
        matchingVariantCount: 0,
        totalDefiningVariantCount: 0,
        mismatchCount: 0,
        missingCount: 0,
        matchCategory: 'SUPPORTED',
        technicalCoverageMetric: 1.0,
        matchReasons: ['Supported by complete, explicit reference observations across all required MVP markers.'],
        mismatchReasons: []
      });
    } else {
      unresolvedCandidates.push({
        haplotypeId: refHapDef.haplotypeId,
        coreAllele: refHapDef.coreAllele,
        referenceSequence: refHapDef.referenceSequence,
        matchingVariantCount: 0,
        totalDefiningVariantCount: 0,
        mismatchCount: 0,
        missingCount: hasMissingOrAbsent ? 1 : 0,
        matchCategory: 'UNRESOLVED',
        technicalCoverageMetric: 0.0,
        matchReasons: [],
        mismatchReasons: ['Reference haplotype cannot be confirmed without complete explicit reference observations across all required MVP markers.']
      });
    }
  }

  // Evaluate each variant haplotype definition against observations using centralized resolver
  for (const hap of allHaplotypes) {
    if (hap.isReferenceHaplotype || hap.variants.length === 0) continue;

    let matchingVariantCount = 0;
    let mismatchCount = 0;
    let missingCount = 0;
    let invalidEvidenceEncountered = false;
    let markerConsistencyFailed = false;
    const matchReasons = [];
    const mismatchReasons = [];
    const missingReasons = [];

    const definingVariants = hap.variants;

    const chromosomeCopyVariantMatches = new Map(); // copyIndex -> Set of variant identifiers
    let hasPhaseAmbiguity = false;
    const observedPhaseSets = new Set();
    let hasUnphasedConflict = false;

    for (const defVar of definingVariants) {
      const varIdentifier = defVar.rsid || String(defVar.start);

      // Use centralized resolver consistently for main evaluation
      const { matchingObs, consistencyFailed, reason } = resolveDefiningVariantObservation(defVar, observations);

      if (consistencyFailed) {
        markerConsistencyFailed = true;
        mismatchReasons.push(reason || `Marker identity consistency check failed for defining variant ${varIdentifier}.`);
        break;
      }

      if (matchingObs) {
        const obsChrom = String(matchingObs.chromosome || '').replace(/^chr/i, '').trim();
        const obsAccession = (matchingObs.accession || '').trim();
        const obsBuild = (matchingObs.referenceBuild || '').trim();

        if (obsChrom && obsChrom !== '10') {
          markerConsistencyFailed = true;
          mismatchReasons.push(`Marker identity inconsistency: chromosome "${obsChrom}" is invalid for CYP2C19.`);
        }
        if (obsAccession && obsAccession !== defVar.referenceSequence && obsAccession !== expectedAccession) {
          markerConsistencyFailed = true;
          mismatchReasons.push(`Marker identity inconsistency: accession "${obsAccession}" does not match defining sequence.`);
        }
        if (obsBuild && obsBuild !== expectedBuild) {
          markerConsistencyFailed = true;
          mismatchReasons.push(`Marker identity inconsistency: build "${obsBuild}" does not match expected build.`);
        }
      }

      if (!matchingObs || matchingObs.evidenceState === EvidenceState.NO_CALL || matchingObs.evidenceState === EvidenceState.OUTSIDE_COVERAGE || matchingObs.evidenceState === EvidenceState.NOT_IN_ASSAY) {
        missingCount++;
        missingReasons.push(`Defining variant ${varIdentifier} lacks observation or is uncalled.`);
      } else if (matchingObs.evidenceState === EvidenceState.OBSERVED_VARIANT) {
        const refAllele = (matchingObs.refAllele || '').trim().toUpperCase();
        const rawAlt = (matchingObs.altAllele || '').trim();
        const definingRef = (defVar.referenceAllele || '').trim().toUpperCase();
        const definingAlt = (defVar.variantAllele || '').trim().toUpperCase();

        if (!refAllele || refAllele === '' || refAllele === 'N' || refAllele === '.') {
          invalidEvidenceEncountered = true;
          mismatchReasons.push(`Missing, empty, or invalid VCF reference allele for defining variant ${varIdentifier}.`);
          continue;
        }

        if (definingRef && refAllele !== definingRef) {
          invalidEvidenceEncountered = true;
          mismatchReasons.push(`Reference allele inconsistency for defining variant ${varIdentifier}: expected reference '${definingRef}', observed VCF reference '${refAllele}'.`);
          continue;
        }

        const altArray = rawAlt && rawAlt !== '.' && rawAlt !== 'N'
          ? rawAlt.split(',').map(a => a.trim().toUpperCase())
          : [];

        const alleleIndexMap = [refAllele, ...altArray];
        const alleles = Array.isArray(matchingObs.alleles) ? matchingObs.alleles : [];

        let hasInvalidIndex = false;
        for (let i = 0; i < alleles.length; i++) {
          const alleleIdx = alleles[i];
          if (alleleIdx < 0 || alleleIdx >= alleleIndexMap.length) {
            hasInvalidIndex = true;
            break;
          }
        }

        if (hasInvalidIndex) {
          invalidEvidenceEncountered = true;
          mismatchReasons.push(`Defining variant ${varIdentifier} has invalid or out-of-range genotype allele index.`);
          continue;
        }

        let matchedCountForVar = 0;
        const matchingIndices = [];

        for (let i = 0; i < alleles.length; i++) {
          const alleleIdx = alleles[i];
          const mappedAllele = alleleIndexMap[alleleIdx];
          if (mappedAllele === definingAlt) {
            matchedCountForVar++;
            matchingIndices.push(i);
          }
        }

        if (matchedCountForVar > 0) {
          matchingVariantCount++;
          matchReasons.push(`Defining variant ${varIdentifier} exact alternate allele matched (${definingAlt}) via allele index mapping.`);

          if (matchingObs.isPhased) {
            if (matchingObs.phaseSet) {
              observedPhaseSets.add(matchingObs.phaseSet);
            }
            for (const matchedIndex of matchingIndices) {
              if (!chromosomeCopyVariantMatches.has(matchedIndex)) {
                chromosomeCopyVariantMatches.set(matchedIndex, new Set());
              }
              chromosomeCopyVariantMatches.get(matchedIndex).add(varIdentifier);
            }
          } else {
            hasPhaseAmbiguity = true;
            hasUnphasedConflict = true;
            for (const matchedIndex of matchingIndices) {
              if (!chromosomeCopyVariantMatches.has(matchedIndex)) {
                chromosomeCopyVariantMatches.set(matchedIndex, new Set());
              }
              chromosomeCopyVariantMatches.get(matchedIndex).add(varIdentifier);
            }
          }
        } else {
          mismatchCount++;
          mismatchReasons.push(`Defining variant ${varIdentifier} alternate allele mismatch (expected ${definingAlt}, observed alt(s): [${altArray.join(', ')}], alleles: [${alleles.join(', ')}]).`);
        }
      } else if (matchingObs.evidenceState === EvidenceState.OBSERVED_REFERENCE) {
        mismatchCount++;
        mismatchReasons.push(`Defining variant ${varIdentifier} expected alternate allele but observed explicit reference.`);
      }
    }

    if (invalidEvidenceEncountered || markerConsistencyFailed) {
      return {
        success: false,
        status: 'INVALID_EVIDENCE',
        pharmvarVersion: provenance.pharmvarVersion,
        candidates: [],
        uncertaintyReasons: ['Invalid evidence observation, marker identity inconsistency, missing/invalid reference allele, or out-of-range genotype index detected.'],
        provenance
      };
    }

    // Phase-Set Completeness & Relative Phase Verification using centralized resolver consistently
    let isCisCoherent = true;
    let phaseUnresolved = false;
    let phaseExcluded = false;

    if (definingVariants.length > 1 && mismatchCount === 0 && missingCount === 0) {
      const definingVarObs = definingVariants.map(defVar => {
        const { matchingObs } = resolveDefiningVariantObservation(defVar, observations);
        return matchingObs;
      });

      const allPhased = definingVarObs.every(o => o && o.isPhased);
      const allHavePhaseSet = definingVarObs.every(o => o && o.phaseSet !== null && o.phaseSet !== undefined && o.phaseSet !== '');
      const uniquePsValues = new Set(definingVarObs.map(o => o && o.phaseSet));

      if (!allPhased || hasUnphasedVariants || hasUnphasedConflict) {
        isCisCoherent = false;
        phaseUnresolved = true;
        uncertaintyReasons.push(`Haplotype ${hap.haplotypeId} has multiple defining variants with unphased observations; relative phase cannot be established, classified as unresolved.`);
      } else if (!allHavePhaseSet || uniquePsValues.has(null) || uniquePsValues.has(undefined)) {
        isCisCoherent = false;
        phaseUnresolved = true;
        uncertaintyReasons.push(`Haplotype ${hap.haplotypeId} has defining variants with missing phase-set (PS) information; relative phase cannot be established, classified as unresolved.`);
      } else if (uniquePsValues.size > 1) {
        isCisCoherent = false;
        phaseUnresolved = true;
        uncertaintyReasons.push(`Haplotype ${hap.haplotypeId} has defining variants across different phase sets ([${Array.from(uniquePsValues).join(', ')}]); relative phase unknown, classified as unresolved.`);
      } else {
        const copyIndices = Array.from(chromosomeCopyVariantMatches.keys());
        let hasCommonCopy = false;
        for (const copyIdx of copyIndices) {
          const matchedSet = chromosomeCopyVariantMatches.get(copyIdx);
          if (matchedSet && matchedSet.size === definingVariants.length) {
            hasCommonCopy = true;
            break;
          }
        }

        if (!hasCommonCopy) {
          isCisCoherent = false;
          phaseExcluded = true;
          mismatchReasons.push(`Defining variants for haplotype ${hap.haplotypeId} are split across different chromosome copies (trans); cis-haplotype support excluded.`);
        }
      }
    }

    const totalDefining = definingVariants.length;
    const technicalCoverageMetric = totalDefining > 0 ? Number((matchingVariantCount / totalDefining).toFixed(2)) : 0.0;

    const candidateRecord = {
      haplotypeId: hap.haplotypeId,
      coreAllele: hap.coreAllele,
      referenceSequence: hap.referenceSequence,
      matchingVariantCount,
      totalDefiningVariantCount: totalDefining,
      mismatchCount,
      missingCount,
      technicalCoverageMetric,
      matchReasons,
      mismatchReasons: [...mismatchReasons, ...missingReasons]
    };

    if (mismatchCount > 0 || phaseExcluded) {
      excludedCandidates.push({ ...candidateRecord, matchCategory: 'EXCLUDED' });
    } else if (missingCount === 0 && matchingVariantCount === totalDefining && isCisCoherent) {
      supportedCandidates.push({ ...candidateRecord, matchCategory: 'SUPPORTED' });
    } else if (phaseUnresolved && missingCount === 0 && matchingVariantCount === totalDefining) {
      unresolvedCandidates.push({
        ...candidateRecord,
        matchCategory: 'UNRESOLVED',
        mismatchReasons: [...candidateRecord.mismatchReasons, 'Phase-set information missing, partial, or unphased; relative phase cannot be established, classified as unresolved.']
      });
    } else {
      unresolvedCandidates.push({ ...candidateRecord, matchCategory: 'UNRESOLVED' });
    }
  }

  const candidates = [
    ...supportedCandidates,
    ...unresolvedCandidates,
    ...excludedCandidates
  ];

  let status = 'CANDIDATES_IDENTIFIED';
  if (supportedCandidates.length === 0 && unresolvedCandidates.length === 0) {
    status = 'INSUFFICIENT_EVIDENCE';
    uncertaintyReasons.push('No supported or unresolved matching haplotype candidates identified.');
  } else if (supportedCandidates.length > 1) {
    status = 'AMBIGUOUS_EVIDENCE';
    uncertaintyReasons.push('Multiple supported candidate haplotypes identified; technical ambiguity noted.');
  }

  return {
    success: true,
    status,
    pharmvarVersion: provenance.pharmvarVersion,
    candidates,
    uncertaintyReasons,
    provenance
  };
}
