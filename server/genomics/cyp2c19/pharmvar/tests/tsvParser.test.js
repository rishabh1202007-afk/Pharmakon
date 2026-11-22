/**
 * Automated Unit Tests for PharmVar TSV Parser (Phase 2B.2)
 */

import { describe, it, expect } from 'vitest';
import { parsePharmVarTsv } from '../tsvParser.js';

const SYNTHETIC_TSV_FIXTURE = `Haplotype Name\tGene\trsID\tReferenceSequence\tVariant Start\tVariant Stop\tReference Allele\tVariant Allele\tType
CYP2C19*1\tCYP2C19\t\tREFERENCE\t.\t.\tREFERENCE\t.\t
CYP2C19*2.001\tCYP2C19\trs4244285\tNC_000010.10\t96541616\t96541616\tG\tA\tsubstitution
CYP2C19*2.001\tCYP2C19\trs12769205\tNC_000010.10\t96535124\t96535124\tA\tG\tsubstitution
CYP2C19*3.001\tCYP2C19\trs4986893\tNC_000010.10\t96540410\t96540410\tG\tA\tsubstitution
`;

describe('PharmVar TSV Parser', () => {
  it('should parse valid TSV with headers and multi-row haplotypes', () => {
    const res = parsePharmVarTsv(SYNTHETIC_TSV_FIXTURE);
    expect(res.success).toBe(true);
    expect(res.rawRecords.length).toBe(4);
    expect(res.rawRecords[0].haplotypeName).toBe('CYP2C19*1');
    expect(res.rawRecords[1].rsid).toBe('rs4244285');
    expect(res.rawRecords[2].rsid).toBe('rs12769205');
  });

  it('should handle missing or invalid TSV gracefully', () => {
    const res = parsePharmVarTsv('');
    expect(res.success).toBe(false);
    expect(res.rawRecords).toEqual([]);
  });
});
