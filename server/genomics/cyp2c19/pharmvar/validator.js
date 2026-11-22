/**
 * PharmVar Record Validator (Phase 2B.2 Final Targeted Correction)
 * Validates raw records and normalized haplotypes with strict coordinate checking,
 * explicit reference-row recognition, and row-number error reporting.
 */

/**
 * Validate raw records and normalized haplotypes.
 * @param {import('./types.js').PharmVarRawRecord[]} rawRecords
 * @param {import('./types.js').NormalizedHaplotype[]} haplotypes
 * @returns {{isValid: boolean, errors: import('./types.js').ValidationMessage[], warnings: import('./types.js').ValidationMessage[]}}
 */
export function validatePharmVarData(rawRecords, haplotypes) {
  /** @type {import('./types.js').ValidationMessage[]} */
  const errors = [];
  /** @type {import('./types.js').ValidationMessage[]} */
  const warnings = [];

  if (!rawRecords || rawRecords.length === 0) {
    errors.push({
      severity: 'error',
      message: 'No raw PharmVar records found to validate.',
      code: 'EMPTY_DATASET'
    });
    return { isValid: false, errors, warnings };
  }

  // Validate raw records
  rawRecords.forEach((rec, idx) => {
    const rowNum = rec.sourceRowNumber || idx + 1;

    if (!rec.haplotypeName || rec.haplotypeName === 'INVALID_ROW' || rec.haplotypeName.trim() === '') {
      errors.push({
        severity: 'error',
        rowNumber: rowNum,
        message: `Missing or invalid haplotype identifier at row ${rowNum}.`,
        code: 'MISSING_HAPLOTYPE_NAME'
      });
      return;
    }

    if (!rec.gene || rec.gene.trim() === '') {
      errors.push({
        severity: 'error',
        rowNumber: rowNum,
        message: `Missing gene symbol at row ${rowNum}.`,
        code: 'MISSING_GENE_SYMBOL'
      });
    }

    const refAllele = (rec.referenceAllele || '').trim();
    const varAllele = (rec.variantAllele || '').trim();

    // Check if both alleles are completely empty
    if (refAllele === '' && varAllele === '') {
      errors.push({
        severity: 'error',
        rowNumber: rowNum,
        message: `Malformed record: both reference and variant alleles are empty at row ${rowNum}.`,
        code: 'MALFORMED_EMPTY_ALLELES'
      });
      return;
    }

    // Reference row recognition: variantStart === '.'
    const isStartDot = (rec.variantStart || '').trim() === '.';

    if (isStartDot) {
      if (refAllele.toUpperCase() !== 'REFERENCE' || varAllele !== '.') {
        errors.push({
          severity: 'error',
          rowNumber: rowNum,
          message: `Inconsistent reference row allele representation at row ${rowNum}.`,
          code: 'INCONSISTENT_ALLELE_COMBINATION'
        });
        return;
      }
      return; // Valid reference row
    }

    // Reject inconsistent reference/variant allele marker combinations on variant rows
    if (refAllele.toUpperCase() === 'REFERENCE' && varAllele !== '.') {
      errors.push({
        severity: 'error',
        rowNumber: rowNum,
        message: `Inconsistent reference/variant allele combination ('REFERENCE' with non-dot variant allele) at row ${rowNum}.`,
        code: 'INCONSISTENT_ALLELE_COMBINATION'
      });
      return;
    }

    if (varAllele === '.' && refAllele.toUpperCase() !== 'REFERENCE') {
      errors.push({
        severity: 'error',
        rowNumber: rowNum,
        message: `Inconsistent reference/variant allele combination (variant allele '.' without 'REFERENCE') at row ${rowNum}.`,
        code: 'INCONSISTENT_ALLELE_COMBINATION'
      });
      return;
    }

    // Non-reference variant record: require valid reference sequence accession
    if (!rec.referenceSequence || rec.referenceSequence.trim() === '') {
      errors.push({
        severity: 'error',
        rowNumber: rowNum,
        message: `Missing reference sequence accession on variant row at row ${rowNum}.`,
        code: 'MISSING_REFERENCE_SEQUENCE'
      });
      return;
    }

    // Non-reference variant record validation: require both start and stop coordinates to be present, finite, positive integers.
    const startStr = (rec.variantStart || '').trim();
    const stopStr = (rec.variantStop || '').trim();

    let hasCoordError = false;

    if (!startStr) {
      errors.push({
        severity: 'error',
        rowNumber: rowNum,
        message: `Empty variant start coordinate at row ${rowNum}.`,
        code: 'EMPTY_START_COORDINATE'
      });
      hasCoordError = true;
    } else if (isNaN(Number(startStr))) {
      errors.push({
        severity: 'error',
        rowNumber: rowNum,
        message: `Non-numeric variant start coordinate: "${rec.variantStart}" at row ${rowNum}.`,
        code: 'NON_NUMERIC_START'
      });
      hasCoordError = true;
    }

    if (!stopStr) {
      errors.push({
        severity: 'error',
        rowNumber: rowNum,
        message: `Empty variant stop coordinate at row ${rowNum}.`,
        code: 'EMPTY_STOP_COORDINATE'
      });
      hasCoordError = true;
    } else if (isNaN(Number(stopStr))) {
      errors.push({
        severity: 'error',
        rowNumber: rowNum,
        message: `Non-numeric variant stop coordinate: "${rec.variantStop}" at row ${rowNum}.`,
        code: 'NON_NUMERIC_STOP'
      });
      hasCoordError = true;
    }

    if (hasCoordError) {
      return;
    }

    const startNum = Number(startStr);
    const endNum = Number(stopStr);

    if (!Number.isInteger(startNum) || startNum <= 0) {
      errors.push({
        severity: 'error',
        rowNumber: rowNum,
        message: `Variant start coordinate must be a positive integer: ${startNum} at row ${rowNum}.`,
        code: 'INVALID_START_COORDINATE'
      });
    }

    if (!Number.isInteger(endNum) || endNum <= 0) {
      errors.push({
        severity: 'error',
        rowNumber: rowNum,
        message: `Variant stop coordinate must be a positive integer: ${endNum} at row ${rowNum}.`,
        code: 'INVALID_STOP_COORDINATE'
      });
    }

    if (startNum > endNum) {
      errors.push({
        severity: 'error',
        rowNumber: rowNum,
        message: `Invalid coordinate range (start ${startNum} > stop ${endNum}) at row ${rowNum}.`,
        code: 'INVALID_COORDINATE_RANGE'
      });
    }
  });

  // Validate normalized haplotypes
  const haplotypeIdsSeen = new Set();
  haplotypes.forEach((hap) => {
    const uniqueKey = `${hap.haplotypeId}::${hap.referenceSequence}`;
    if (haplotypeIdsSeen.has(uniqueKey)) {
      warnings.push({
        severity: 'warning',
        message: `Duplicate haplotype identifier "${hap.haplotypeId}" under reference sequence "${hap.referenceSequence}".`,
        code: 'DUPLICATE_HAPLOTYPE_ID'
      });
    }
    haplotypeIdsSeen.add(uniqueKey);

    if (!hap.gene) {
      errors.push({
        severity: 'error',
        rowNumber: hap.sourceRowNumber,
        message: `Haplotype "${hap.haplotypeId}" has missing gene symbol.`,
        code: 'MISSING_GENE_SYMBOL'
      });
    }

    hap.variants.forEach((v, vIdx) => {
      if (v.start > v.end && v.end !== 0) {
        errors.push({
          severity: 'error',
          rowNumber: hap.sourceRowNumber,
          message: `Haplotype "${hap.haplotypeId}" variant #${vIdx + 1} has start (${v.start}) greater than end (${v.end}).`,
          code: 'INVALID_COORDINATE_RANGE'
        });
      }
    });
  });

  const isValid = errors.filter(e => e.severity === 'error').length === 0;

  return {
    isValid,
    errors,
    warnings
  };
}
