/**
 * PharmVar Record Normalizer (Phase 2B.2)
 * Normalizes raw PharmVar records, groups multi-row variants by haplotype and reference sequence,
 * and handles reference alleles explicitly.
 */

/**
 * Normalize raw records into structured NormalizedHaplotype objects grouped by haplotype and reference sequence.
 * @param {import('./types.js').PharmVarRawRecord[]} rawRecords
 * @returns {{haplotypes: import('./types.js').NormalizedHaplotype[], errors: string[]}}
 */
export function normalizePharmVarRecords(rawRecords) {
  /** @type {Map<string, import('./types.js').NormalizedHaplotype>} */
  const haplotypeMap = new Map();
  const errors = [];

  for (const record of rawRecords) {
    const hapName = record.haplotypeName.trim();
    const refSeq = record.referenceSequence.trim() || 'NC_000010.10';
    const groupKey = `${hapName}::${refSeq}`;

    if (!haplotypeMap.has(groupKey)) {
      // Determine core allele and suballele
      // e.g. "CYP2C19*2.001" -> core: "CYP2C19*2", sub: ".001"
      let coreAllele = hapName;
      let subAllele = null;
      const dotIdx = hapName.indexOf('.');
      if (dotIdx !== -1 && !hapName.startsWith('*')) {
        coreAllele = hapName.substring(0, dotIdx);
        subAllele = hapName.substring(dotIdx);
      } else if (hapName.includes('*')) {
        const parts = hapName.split('.');
        if (parts.length > 1) {
          coreAllele = parts[0];
          subAllele = '.' + parts.slice(1).join('.');
        }
      }

      haplotypeMap.set(groupKey, {
        haplotypeId: hapName,
        coreAllele,
        subAllele,
        gene: record.gene.trim() || 'CYP2C19',
        referenceSequence: refSeq,
        variants: [],
        isReferenceHaplotype: false,
        sourceRowNumber: record.sourceRowNumber
      });
    }

    const haplotypeObj = haplotypeMap.get(groupKey);

    const refAlleleRaw = record.referenceAllele.trim();
    const varAlleleRaw = record.variantAllele.trim();

    const isRefMarker = refAlleleRaw.toUpperCase() === 'REFERENCE' || varAlleleRaw === '.' || (!refAlleleRaw && !varAlleleRaw);

    if (isRefMarker || refAlleleRaw.toUpperCase() === 'REFERENCE') {
      haplotypeObj.isReferenceHaplotype = true;
      continue;
    }

    const startNum = parseInt(record.variantStart, 10);
    const endNum = parseInt(record.variantStop, 10);

    const normalizedVariant = {
      rsid: record.rsid && record.rsid !== '.' ? record.rsid.trim() : `${refSeq}:${isNaN(startNum) ? 0 : startNum}`,
      referenceSequence: refSeq,
      start: isNaN(startNum) ? 0 : startNum,
      end: isNaN(endNum) ? (isNaN(startNum) ? 0 : startNum) : endNum,
      referenceAllele: refAlleleRaw,
      variantAllele: varAlleleRaw,
      variantType: normalizeVariantType(record.variantType, refAlleleRaw, varAlleleRaw),
      isReference: false
    };

    haplotypeObj.variants.push(normalizedVariant);
  }

  return {
    haplotypes: Array.from(haplotypeMap.values()),
    errors
  };
}

function normalizeVariantType(rawType, ref, alt) {
  const t = (rawType || '').toLowerCase().trim();
  if (t) return t;

  if (ref.length === 1 && alt.length === 1) return 'substitution';
  if (ref.length < alt.length) return 'insertion';
  if (ref.length > alt.length) return 'deletion';
  return 'substitution';
}
