/**
 * Automated Unit Tests for PharmVar Loader & Provenance (Phase 2B.2)
 * Verifies actual local v6.2.21 file loading, provenance checksum, and v6.2.29 status.
 */

import { describe, it, expect } from 'vitest';
import { PharmVarDatabase } from '../loader.js';
import { computeChecksum } from '../provenance.js';

describe('PharmVar Database Loader & Provenance', () => {
  it('should load actual local official v6.2.21 dataset successfully', async () => {
    const db = new PharmVarDatabase();
    const result = await db.loadOfficialLocalDataset();

    expect(result.success).toBe(true);
    expect(result.provenance.pharmvarVersion).toBe('6.2.21');
    expect(result.provenance.v6_2_29Imported).toBe(false);
    expect(result.provenance.datasetType).toBe('OFFICIAL_LOCAL_V6_2_21');
    expect(result.provenance.totalRecordsParsed).toBe(345); // 345 data rows in local v6.2.21 TSV
    expect(result.statistics.totalUniqueHaplotypeAccessions).toBeGreaterThan(30);
    expect(result.provenance.sourceFileChecksum).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('should compute reproducible SHA-256 checksums', () => {
    const content = '#version=pharmvar-6.2.21\nHaplotype Name\tGene\nCYP2C19*1\tCYP2C19\n';
    const cs1 = computeChecksum(content);
    const cs2 = computeChecksum(content);
    expect(cs1).toBe(cs2);
    expect(cs1).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});
