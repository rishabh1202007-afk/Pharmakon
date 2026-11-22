/**
 * Automated Unit Tests for PharmVar Normalizer (Phase 2B.2)
 */

import { describe, it, expect } from 'vitest';
import { parsePharmVarTsv } from '../tsvParser.js';
import { normalizePharmVarRecords } from '../normalizer.js';

const FIXTURE = `Haplotype Name\tGene\trsID\tReferenceSequence\tVariant Start\tVariant Stop\tReference Allele\tVariant Allele\tType
CYP2C19*1\tCYP2C19\t\tREFERENCE\t.\t.\tREFERENCE\t.\t
CYP2C19*2.001\tCYP2C19\trs4244285\tNC_000010.10\t96541616\t96541616\tG\tA\tsubstitution
CYP2C19*2.001\tCYP2C19\trs12769205\tNC_000010.10\t96535124\t96535124\tA\tG\tsubstitution
`;

describe('PharmVar Record Normalizer', () => {
  it('should group multi-row variants under correct haplotype and handle reference alleles', () => {
    const parseRes = parsePharmVarTsv(FIXTURE);
    const normRes = normalizePharmVarRecords(parseRes.rawRecords);

    expect(normRes.haplotypes.length).toBe(2);

    const refHap = normRes.haplotypes.find(h => h.haplotypeId === 'CYP2C19*1');
    expect(refHap).toBeDefined();
    expect(refHap.isReferenceHaplotype).toBe(true);
    expect(refHap.variants.length).toBe(0);

    const star2Hap = normRes.haplotypes.find(h => h.haplotypeId === 'CYP2C19*2.001');
    expect(star2Hap).toBeDefined();
    expect(star2Hap.coreAllele).toBe('CYP2C19*2');
    expect(star2Hap.subAllele).toBe('.001');
    expect(star2Hap.variants.length).toBe(2);
    expect(star2Hap.variants[0].rsid).toBe('rs4244285');
    expect(star2Hap.variants[1].rsid).toBe('rs12769205');
  });
});
