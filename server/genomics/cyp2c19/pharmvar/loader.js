/**
 * PharmVar Database Loader (Phase 2B.2)
 * Server-controlled loader for PharmVar TSV allele-definition datasets (local official v6.2.21 or synthetic fixtures).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePharmVarTsv } from './tsvParser.js';
import { normalizePharmVarRecords } from './normalizer.js';
import { validatePharmVarData } from './validator.js';
import { PharmVarIndexer } from './indexer.js';
import { createProvenanceReport } from './provenance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PharmVarDatabase {
  constructor() {
    this.indexer = new PharmVarIndexer();
    /** @type {import('./types.js').DatasetProvenance | null} */
    this.provenance = null;
    /** @type {import('./types.js').ValidationMessage[]} */
    this.lastValidationMessages = [];
    this.isLoaded = false;
  }

  /**
   * Load local official v6.2.21 dataset from disk.
   * @returns {Promise<{success: boolean, statistics: any, provenance: any, error?: string}>}
   */
  async loadOfficialLocalDataset() {
    try {
      const defaultPath = path.resolve(__dirname, '../../../../pharma-rag/dataset/CYP2C19/GRCh37/CYP2C19.NC_000010.10.haplotypes.tsv');
      const tsvContent = await fs.readFile(defaultPath, 'utf8');

      return this.loadFromText(tsvContent, 'OFFICIAL_LOCAL_V6_2_21');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Failed to load official local PharmVar dataset: ${msg}`,
        statistics: null,
        provenance: null
      };
    }
  }

  /**
   * Load synthetic fixture or custom TSV text content.
   * @param {string} tsvText
   * @param {string} [datasetType='SYNTHETIC_FIXTURE']
   * @returns {{success: boolean, statistics: any, provenance: any, error?: string}}
   */
  loadFromText(tsvText, datasetType = 'SYNTHETIC_FIXTURE') {
    const parseRes = parsePharmVarTsv(tsvText);
    if (!parseRes.success) {
      return {
        success: false,
        error: parseRes.error || 'TSV parsing failed.',
        statistics: null,
        provenance: null
      };
    }

    const normRes = normalizePharmVarRecords(parseRes.rawRecords);
    const valRes = validatePharmVarData(parseRes.rawRecords, normRes.haplotypes);

    const allMessages = [
      ...parseRes.warnings,
      ...valRes.errors,
      ...valRes.warnings
    ];

    this.lastValidationMessages = allMessages;

    if (!valRes.isValid) {
      return {
        success: false,
        error: `PharmVar dataset validation failed with ${valRes.errors.length} error(s).`,
        validationErrors: valRes.errors,
        statistics: null,
        provenance: null
      };
    }

    // Build indexes
    this.indexer.buildIndexes(normRes.haplotypes);
    this.provenance = createProvenanceReport(
      datasetType,
      tsvText,
      parseRes.rawRecords.length,
      normRes.haplotypes.length,
      allMessages
    );
    this.isLoaded = true;

    return {
      success: true,
      statistics: this.indexer.getStatistics(),
      provenance: this.provenance
    };
  }
}

// Singleton instance for server use
export const defaultPharmVarDb = new PharmVarDatabase();
