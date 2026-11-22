/**
 * Genotype Evidence Normalizer (Phase 2B.3A)
 * Normalizes VCF variant records and sample genotype calls into structured GenotypeObservation objects.
 */

import { EvidenceState } from './types.js';
import { CYP2C19_MVP_MARKERS } from '../types.js';

/**
 * Normalize VCF variant records and sample genotype calls into explicit GenotypeObservations.
 * @param {import('../types.js').VariantRecord[]} variants
 * @param {string} sampleId
 * @param {string} [expectedAccession='NC_000010.10']
 * @param {string} [expectedBuild='GRCh37']
 * @param {import('./types.js').QualityConfig} [qualityConfig={}]
 * @param {string[]} [assayManifestMarkers]
 * @returns {import('./types.js').GenotypeObservation[]}
 */
export function normalizeGenotypeEvidence(variants, sampleId, expectedAccession = 'NC_000010.10', expectedBuild = 'GRCh37', qualityConfig = {}, assayManifestMarkers = null) {
  const observations = [];
  const markersToCheck = assayManifestMarkers || CYP2C19_MVP_MARKERS.map(m => m.rsid);

  for (const markerRsid of markersToCheck) {
    const markerDef = CYP2C19_MVP_MARKERS.find(m => m.rsid.toLowerCase() === markerRsid.toLowerCase());
    const expectedPos = markerDef ? markerDef.pos : null;

    // Search for variant record matching rsID or position on chr10 / chr
    const foundVariant = variants.find(v => {
      const isChr10 = v.chrom === '10' || v.chrom.toLowerCase() === 'chr10';
      const matchesId = v.rsid.toLowerCase() === markerRsid.toLowerCase();
      const matchesPos = expectedPos && v.pos === expectedPos;
      return isChr10 && (matchesId || matchesPos);
    });

    if (!foundVariant) {
      // Absent VCF record is NEVER assumed homozygous reference. State is OUTSIDE_COVERAGE or NOT_IN_ASSAY.
      observations.push({
        rsid: markerRsid,
        position: expectedPos || 'UNKNOWN',
        chromosome: '10',
        accession: expectedAccession,
        referenceBuild: expectedBuild,
        sampleId,
        refAllele: 'N',
        altAllele: 'N',
        rawGt: '',
        alleles: [],
        isPhased: false,
        phaseSet: null,
        depth: null,
        genotypeQuality: null,
        filterStatus: 'ABSENT',
        evidenceState: EvidenceState.OUTSIDE_COVERAGE,
        validationWarnings: ['Marker record absent from VCF variants. Not assumed reference.'],
        validationErrors: []
      });
      continue;
    }

    const call = foundVariant.genotypes[sampleId];
    if (!call) {
      observations.push({
        rsid: foundVariant.rsid,
        position: foundVariant.pos,
        chromosome: foundVariant.chrom,
        accession: expectedAccession,
        referenceBuild: expectedBuild,
        sampleId,
        refAllele: foundVariant.ref,
        altAllele: foundVariant.alt,
        rawGt: './.',
        alleles: [],
        isPhased: false,
        phaseSet: null,
        depth: null,
        genotypeQuality: null,
        filterStatus: foundVariant.filter,
        evidenceState: EvidenceState.NO_CALL,
        validationWarnings: [`Sample ID "${sampleId}" has no genotype call recorded for variant position ${foundVariant.pos}.`],
        validationErrors: []
      });
      continue;
    }

    let evidenceState = EvidenceState.UNKNOWN;
    const warnings = [];
    const errors = [];

    if (call.isMissing) {
      evidenceState = EvidenceState.NO_CALL;
    } else {
      const isHomRef = call.alleles.length > 0 && call.alleles.every(a => a === 0);
      evidenceState = isHomRef ? EvidenceState.OBSERVED_REFERENCE : EvidenceState.OBSERVED_VARIANT;

      // Evaluate explicit quality thresholds if configured
      if (qualityConfig.minDepth !== undefined && call.depth !== null && call.depth < qualityConfig.minDepth) {
        evidenceState = EvidenceState.LOW_QUALITY;
        warnings.push(`Read depth (${call.depth}) is below configured minDepth threshold (${qualityConfig.minDepth}).`);
      }
      if (qualityConfig.minGenotypeQuality !== undefined && call.genotypeQuality !== null && call.genotypeQuality < qualityConfig.minGenotypeQuality) {
        evidenceState = EvidenceState.LOW_QUALITY;
        warnings.push(`Genotype quality (${call.genotypeQuality}) is below configured minGenotypeQuality threshold (${qualityConfig.minGenotypeQuality}).`);
      }
    }

    observations.push({
      rsid: foundVariant.rsid,
      position: foundVariant.pos,
      chromosome: foundVariant.chrom,
      accession: expectedAccession,
      referenceBuild: expectedBuild,
      sampleId,
      refAllele: foundVariant.ref,
      altAllele: foundVariant.alt,
      rawGt: call.rawGt,
      alleles: call.alleles,
      isPhased: call.isPhased,
      phaseSet: call.phaseSet,
      depth: call.depth,
      genotypeQuality: call.genotypeQuality,
      filterStatus: foundVariant.filter,
      evidenceState,
      validationWarnings: warnings,
      validationErrors: errors
    });
  }

  return observations;
}
