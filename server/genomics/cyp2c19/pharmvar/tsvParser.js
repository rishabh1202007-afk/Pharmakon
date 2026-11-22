/**
 * PharmVar TSV Parser (Phase 2B.2 Final Correction)
 * Parses PharmVar TSV allele definition files robustly, normalizing genuinely empty
 * allele fields on explicit REFERENCE sentinel rows while preserving contradictory non-empty values.
 */

/**
 * Parse raw PharmVar TSV content into raw record objects.
 * @param {string} tsvText
 * @returns {{success: boolean, rawRecords: import('./types.js').PharmVarRawRecord[], warnings: import('./types.js').ValidationMessage[], error: string|null}}
 */
export function parsePharmVarTsv(tsvText) {
  if (!tsvText || typeof tsvText !== 'string') {
    return {
      success: false,
      rawRecords: [],
      warnings: [],
      error: 'Invalid or empty TSV content supplied.'
    };
  }

  const lines = tsvText.split(/\r?\n/);
  /** @type {import('./types.js').ValidationMessage[]} */
  const warnings = [];
  /** @type {import('./types.js').PharmVarRawRecord[]} */
  const rawRecords = [];

  let headerIndex = -1;
  /** @type {string[]} */
  let columnMap = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) continue;

    if (trimmed.startsWith('#version=')) {
      continue;
    }

    if (trimmed.startsWith('#') || trimmed.startsWith('//')) {
      continue;
    }

    const columns = line.split('\t').map(c => c.trim());

    if (headerIndex === -1 && (columns.includes('Haplotype Name') || columns.includes('Variant Start') || columns.some(c => c.toLowerCase().includes('haplotype')))) {
      headerIndex = i;
      columnMap = columns.map(c => c.toLowerCase());
      continue;
    }

    if (headerIndex !== -1 && i > headerIndex) {
      const sourceRowNumber = i + 1;

      const hapIdx = findColumnIndex(columnMap, ['haplotype name', 'haplotype', 'name'], 0);
      const geneIdx = findColumnIndex(columnMap, ['gene'], 1);
      const rsidIdx = findColumnIndex(columnMap, ['rsid', 'id'], 2);
      const refSeqIdx = findColumnIndex(columnMap, ['referencesequence', 'refseq', 'sequence'], 3);
      const startIdx = findColumnIndex(columnMap, ['variant start', 'start', 'position'], 4);
      const stopIdx = findColumnIndex(columnMap, ['variant stop', 'stop', 'end'], 5);
      const refAlleleIdx = findColumnIndex(columnMap, ['reference allele', 'ref allele', 'ref'], 6);
      const varAlleleIdx = findColumnIndex(columnMap, ['variant allele', 'var allele', 'alt'], 7);
      const typeIdx = findColumnIndex(columnMap, ['type', 'variant type'], 8);

      const haplotypeName = columns[hapIdx] || '';
      const gene = columns[geneIdx] || '';

      const rawRefSeq = columns[refSeqIdx] || '';
      const variantStart = columns[startIdx] || '';
      const variantStop = columns[stopIdx] || '';
      let referenceAllele = columns[refAlleleIdx] || '';
      let variantAllele = columns[varAlleleIdx] || '';
      const variantType = columns[typeIdx] || '';

      let referenceSequence = rawRefSeq;
      if (rawRefSeq.toUpperCase() === 'REFERENCE' || rawRefSeq === '.') {
        referenceSequence = 'NC_000010.10';
      }

      // If rawRefSeq is explicit REFERENCE sentinel:
      if (rawRefSeq.trim().toUpperCase() === 'REFERENCE') {
        referenceSequence = 'NC_000010.10';
        if (!referenceAllele && !variantAllele) {
          referenceAllele = 'REFERENCE';
          variantAllele = '.';
        }
      }

      if (!haplotypeName) {
        warnings.push({
          severity: 'warning',
          rowNumber: sourceRowNumber,
          message: `Preserved row with missing haplotype identifier at row ${sourceRowNumber} for validation.`,
          code: 'MISSING_HAPLOTYPE_NAME'
        });
      }

      rawRecords.push({
        haplotypeName,
        gene,
        rsid: columns[rsidIdx] || '',
        referenceSequence,
        variantStart,
        variantStop,
        referenceAllele,
        variantAllele,
        variantType,
        sourceRowNumber
      });
    }
  }

  return {
    success: true,
    rawRecords,
    warnings,
    error: null
  };
}

function findColumnIndex(columnMap, candidates, fallbackIndex) {
  for (const cand of candidates) {
    const idx = columnMap.indexOf(cand);
    if (idx !== -1) return idx;
  }
  return fallbackIndex;
}
