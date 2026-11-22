/**
 * PharmVar Provenance & Checksum Utility (Phase 2B.2)
 * Computes SHA-256 checksums and generates dataset provenance metadata.
 */

import crypto from 'node:crypto';

/**
 * Compute SHA-256 checksum of raw source text.
 * @param {string} content
 * @returns {string}
 */
export function computeChecksum(content) {
  if (!content) return 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const hash = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  return `sha256:${hash}`;
}

/**
 * Generate dataset provenance report.
 * @param {string} datasetType
 * @param {string} content
 * @param {number} totalRecords
 * @param {number} validHaplotypes
 * @param {import('./types.js').ValidationMessage[]} validationMessages
 * @returns {import('./types.js').DatasetProvenance}
 */
export function createProvenanceReport(datasetType, content, totalRecords, validHaplotypes, validationMessages) {
  return {
    datasetType,
    pharmvarVersion: '6.2.21',
    v6_2_29Imported: false, // Official v6.2.29 could not be downloaded via automated script; local v6.2.21 used
    sourceFileChecksum: computeChecksum(content),
    importedAtIso: new Date().toISOString(),
    totalRecordsParsed: totalRecords,
    validHaplotypesCount: validHaplotypes,
    validationMessages
  };
}
