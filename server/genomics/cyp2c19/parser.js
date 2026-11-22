/**
 * CYP2C19 Genomic Infrastructure — VCF Parser & Sample Selector (Phase 2B.1 Hardened & Verified)
 * Robust VCF v4.x line-based parser with multisample support, GT/PS extraction,
 * chromosome/reference-build consistency checks, and technical callability reporting.
 *
 * STRICT BOUNDARIES: No clinical interpretation, diplotype assignment,
 * or drug-gene recommendations. Technical scaffolding only.
 */

import { CYP2C19_MVP_MARKERS } from './types.js';

/**
 * Parse INFO field into key-value map.
 * @param {string} infoStr
 * @returns {Record<string, string>}
 */
export function parseInfoField(infoStr) {
  if (!infoStr || infoStr === '.') return {};
  return infoStr
    .split(';')
    .map(chunk => chunk.trim())
    .filter(Boolean)
    .reduce((acc, item) => {
      const [rawKey, ...valParts] = item.split('=');
      if (rawKey) {
        acc[rawKey.trim().toUpperCase()] = valParts.join('=').trim();
      }
      return acc;
    }, {});
}

/**
 * Parse genotype format and sample values, extracting raw unvalidated DP/GQ metrics.
 * @param {string} formatStr - e.g. "GT:DP:PS"
 * @param {string} sampleStr - e.g. "0|1:35:1001"
 * @param {string} sampleId
 * @returns {import('./types.js').GenotypeCall}
 */
export function parseGenotypeCall(formatStr, sampleStr, sampleId) {
  const formatKeys = (formatStr || 'GT').split(':');
  const values = (sampleStr || './.').split(':');

  const gtIdx = formatKeys.indexOf('GT');
  const psIdx = formatKeys.indexOf('PS');
  const dpIdx = formatKeys.indexOf('DP');
  const gqIdx = formatKeys.indexOf('GQ');

  const rawGt = gtIdx !== -1 && values[gtIdx] !== undefined ? values[gtIdx] : './.';
  const isMissing = rawGt === './.' || rawGt === '.' || rawGt === '';

  const isPhased = rawGt.includes('|');
  const separator = isPhased ? '|' : '/';

  let alleles = [];
  if (!isMissing) {
    alleles = rawGt.split(separator).map(a => (a === '.' ? -1 : parseInt(a, 10)));
  }

  const phaseSet = psIdx !== -1 && values[psIdx] !== undefined && values[psIdx] !== '.' ? values[psIdx] : null;
  const depth = dpIdx !== -1 && values[dpIdx] !== undefined && values[dpIdx] !== '.' ? parseInt(values[dpIdx], 10) : null;
  const genotypeQuality = gqIdx !== -1 && values[gqIdx] !== undefined && values[gqIdx] !== '.' ? parseFloat(values[gqIdx]) : null;

  return {
    sampleId,
    rawGt,
    alleles,
    isPhased,
    isMissing,
    phaseSet,
    depth: Number.isNaN(depth) ? null : depth,
    genotypeQuality: Number.isNaN(genotypeQuality) ? null : genotypeQuality
  };
}

/**
 * Parse raw VCF content with strict sample selection and chromosome consistency checks.
 * @param {string} vcfText
 * @param {string} [targetSampleId]
 * @returns {import('./types.js').VcfParseResult}
 */
export function parseVcfContent(vcfText, targetSampleId = null) {
  if (!vcfText || typeof vcfText !== 'string') {
    return {
      success: false,
      error: 'Invalid or empty VCF content supplied.',
      metadata: { fileFormat: 'VCFv4.x', referenceBuild: null, fileDate: '', sampleIds: [], totalVariants: 0 },
      variants: [],
      selectedSampleGenotypes: null,
      provenance: createEmptyProvenance()
    };
  }

  const lines = vcfText.split(/\r?\n/);
  let fileFormat = 'VCFv4.x';
  let referenceBuild = null;
  let fileDate = '';
  /** @type {string[]} */
  let sampleIds = [];
  /** @type {import('./types.js').VariantRecord[]} */
  const variants = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('##')) {
      if (trimmed.startsWith('##fileformat=')) {
        fileFormat = trimmed.split('=')[1] || 'VCFv4.x';
      } else if (trimmed.startsWith('##reference=')) {
        referenceBuild = trimmed.split('=')[1] || null;
      } else if (trimmed.startsWith('##fileDate=')) {
        fileDate = trimmed.split('=')[1] || '';
      }
      continue;
    }

    if (trimmed.startsWith('#CHROM')) {
      const parts = trimmed.split('\t');
      if (parts.length > 9) {
        sampleIds = parts.slice(9);
      }
      continue;
    }

    const parts = trimmed.split('\t');
    if (parts.length < 8) continue;

    const [chrom, pos, id, ref, alt, qual, filter, info, format = 'GT', ...sampleValues] = parts;
    const formatFields = format.split(':');

    /** @type {Record<string, import('./types.js').GenotypeCall>} */
    const genotypes = {};
    sampleIds.forEach((sId, idx) => {
      const sVal = sampleValues[idx] || './.';
      genotypes[sId] = parseGenotypeCall(format, sVal, sId);
    });

    variants.push({
      chrom,
      pos,
      rsid: id && id !== '.' ? id : `${chrom}:${pos}`,
      ref,
      alt,
      qual: qual !== '.' ? qual : null,
      filter,
      infoRaw: info,
      infoMap: parseInfoField(info),
      formatFields,
      genotypes
    });
  }

  // Strict sample selection validation
  let selectedId = targetSampleId;
  if (selectedId) {
    if (!sampleIds.includes(selectedId)) {
      return {
        success: false,
        error: `Requested sample ID "${selectedId}" not found in VCF sample headers. Available samples: ${sampleIds.join(', ')}`,
        metadata: { fileFormat, referenceBuild, fileDate, sampleIds, totalVariants: variants.length },
        variants,
        selectedSampleGenotypes: null,
        provenance: createEmptyProvenance()
      };
    }
  } else if (sampleIds.length > 0) {
    selectedId = sampleIds[0]; // Default to first sample only if sample list exists
  }

  /** @type {Record<string, import('./types.js').GenotypeCall> | null} */
  let selectedSampleGenotypes = null;
  if (selectedId && sampleIds.includes(selectedId)) {
    selectedSampleGenotypes = {};
    variants.forEach(v => {
      if (v.genotypes[selectedId]) {
        selectedSampleGenotypes[v.rsid] = v.genotypes[selectedId];
        selectedSampleGenotypes[`${v.chrom}:${v.pos}`] = v.genotypes[selectedId];
      }
    });
  }

  // Evaluate technical callability against CYP2C19 MVP markers with chromosome consistency (chr 10)
  const analyzedMarkers = CYP2C19_MVP_MARKERS.map(m => m.rsid);
  const markerRecordsAvailable = [];
  const sampleGenotypesPresent = [];
  /** @type {Record<string, {depth: number|null, genotypeQuality: number|null}>} */
  const rawQualityMetrics = {};

  CYP2C19_MVP_MARKERS.forEach(marker => {
    // Require chromosome to be 10 or chr10 for CYP2C19
    const found = variants.find(v => {
      const isChr10 = v.chrom === '10' || v.chrom.toLowerCase() === 'chr10';
      const matchesIdOrPos = v.rsid.toLowerCase() === marker.rsid.toLowerCase() || v.pos === marker.pos;
      return isChr10 && matchesIdOrPos;
    });

    if (found) {
      markerRecordsAvailable.push(marker.rsid);
      if (selectedId && found.genotypes[selectedId] && !found.genotypes[selectedId].isMissing) {
        sampleGenotypesPresent.push(marker.rsid);
        const call = found.genotypes[selectedId];
        rawQualityMetrics[marker.rsid] = {
          depth: call.depth,
          genotypeQuality: call.genotypeQuality
        };
      }
      // NOTE: If no valid sample ID is selected or if genotype is missing, sampleGenotypesPresent is NOT populated.
    }
  });

  const missingCount = analyzedMarkers.length - sampleGenotypesPresent.length;
  let technicalCallabilityStatus = 'SUFFICIENT';
  if (missingCount > 0 && sampleGenotypesPresent.length > 0) {
    technicalCallabilityStatus = 'PARTIAL';
  } else if (sampleGenotypesPresent.length === 0) {
    technicalCallabilityStatus = 'INSUFFICIENT';
  }

  const uncertaintyFlags = [];
  if (missingCount > 0) {
    uncertaintyFlags.push('MVP_MARKERS_MISSING_FROM_VCF');
  }
  if (!referenceBuild) {
    uncertaintyFlags.push('REFERENCE_BUILD_UNSPECIFIED');
  }
  uncertaintyFlags.push('CLINICAL_ASSAY_CALLABILITY_UNVALIDATED');

  const provenance = {
    pharmvarVersion: '6.2.21 (local repository scaffolding)',
    parserVersion: '1.0.2-hardened',
    timestampIso: new Date().toISOString(),
    callability: {
      markersAnalyzed: analyzedMarkers,
      markerRecordsAvailable,
      sampleGenotypesPresent,
      rawQualityMetrics,
      technicalCallabilityStatus,
      assumesReference: false // STRICTLY FALSE: Absent records are NEVER assumed homozygous reference
    },
    uncertaintyFlags
  };

  return {
    success: true,
    error: null,
    metadata: {
      fileFormat,
      referenceBuild,
      fileDate,
      sampleIds,
      totalVariants: variants.length
    },
    variants,
    selectedSampleGenotypes,
    provenance
  };
}

function createEmptyProvenance() {
  return {
    pharmvarVersion: '6.2.21 (local repository scaffolding)',
    parserVersion: '1.0.2-hardened',
    timestampIso: new Date().toISOString(),
    callability: {
      markersAnalyzed: CYP2C19_MVP_MARKERS.map(m => m.rsid),
      markerRecordsAvailable: [],
      sampleGenotypesPresent: [],
      rawQualityMetrics: {},
      technicalCallabilityStatus: 'INSUFFICIENT',
      assumesReference: false
    },
    uncertaintyFlags: ['EMPTY_OR_INVALID_VCF', 'CLINICAL_ASSAY_CALLABILITY_UNVALIDATED']
  };
}
