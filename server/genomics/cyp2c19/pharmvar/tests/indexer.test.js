/**
 * Automated Unit Tests for PharmVar Indexer (Phase 2B.2 Final Acceptance)
 */

import { describe, it, expect } from 'vitest';
import { parsePharmVarTsv } from '../tsvParser.js';
import { normalizePharmVarRecords } from '../normalizer.js';
import { PharmVarIndexer } from '../indexer.js';

const FIXTURE = `Haplotype Name\tGene\trsID\tReferenceSequence\tVariant Start\tVariant Stop\tReference Allele\tVariant Allele\tType
CYP2C19*2.001\tCYP2C19\trs4244285\tNC_000010.10\t96541616\t96541616\tG\tA\tsubstitution
CYP2C19*3.001\tCYP2C19\trs4986893\tNC_000010.10\t96540410\t96540410\tG\tA\tsubstitution
`;

const MULTI_ACCESSION_FIXTURE = `Haplotype Name\tGene\trsID\tReferenceSequence\tVariant Start\tVariant Stop\tReference Allele\tVariant Allele\tType
CYP2C19*2.001\tCYP2C19\trs4244285\tNC_000010.10\t96541616\t96541616\tG\tA\tsubstitution
CYP2C19*2.001\tCYP2C19\trs4244285\tNC_000010.11\t96542000\t96542000\tG\tA\tsubstitution
`;

describe('PharmVar Database Indexer — Comprehensive Coverage', () => {
  it('should build searchable indexes and support lookup by gene, rsID, position, and exact match', () => {
    const parseRes = parsePharmVarTsv(FIXTURE);
    const normRes = normalizePharmVarRecords(parseRes.rawRecords);

    const indexer = new PharmVarIndexer();
    indexer.buildIndexes(normRes.haplotypes);

    // Lookup by gene
    const geneHaps = indexer.getByGene('CYP2C19');
    expect(geneHaps.length).toBe(2);

    // Lookup by rsID
    const rsHaps = indexer.getByRsid('rs4244285');
    expect(rsHaps.length).toBe(1);
    expect(rsHaps[0].haplotypeId).toBe('CYP2C19*2.001');

    // Lookup by position & accession
    const posMatches = indexer.getByPosition('NC_000010.10', 96541616);
    expect(posMatches.length).toBe(1);
    expect(posMatches[0].variant.referenceAllele).toBe('G');
    expect(posMatches[0].variant.variantAllele).toBe('A');

    // Exact match lookup
    const exactMatches = indexer.getByExactMatch('NC_000010.10', 96541616, 'G', 'A');
    expect(exactMatches.length).toBe(1);
  });

  it('should preserve accession-specific identity and return all entries via getAllByHaplotypeId()', () => {
    const parseRes = parsePharmVarTsv(MULTI_ACCESSION_FIXTURE);
    const normRes = normalizePharmVarRecords(parseRes.rawRecords);

    const indexer = new PharmVarIndexer();
    indexer.buildIndexes(normRes.haplotypes);

    const allHaps = indexer.getAllByHaplotypeId('CYP2C19*2.001');
    expect(allHaps.length).toBe(2);

    const hap10 = indexer.getByHaplotypeIdAndAccession('CYP2C19*2.001', 'NC_000010.10');
    const hap11 = indexer.getByHaplotypeIdAndAccession('CYP2C19*2.001', 'NC_000010.11');

    expect(hap10).toBeDefined();
    expect(hap11).toBeDefined();
    expect(hap10.referenceSequence).toBe('NC_000010.10');
    expect(hap11.referenceSequence).toBe('NC_000010.11');
    expect(hap10.variants[0].start).toBe(96541616);
    expect(hap11.variants[0].start).toBe(96542000);
  });
});
