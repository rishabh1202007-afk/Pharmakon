/**
 * Automated Unit Tests for PharmVar Validator (Phase 2B.2 Final Corrections)
 */

import { describe, it, expect } from 'vitest';
import { parsePharmVarTsv } from '../tsvParser.js';
import { normalizePharmVarRecords } from '../normalizer.js';
import { validatePharmVarData } from '../validator.js';

const VALID_FIXTURE = `Haplotype Name\tGene\trsID\tReferenceSequence\tVariant Start\tVariant Stop\tReference Allele\tVariant Allele\tType
CYP2C19*1\tCYP2C19\t\tREFERENCE\t.\t.\tREFERENCE\t.\tsubstitution
CYP2C19*2.001\tCYP2C19\trs4244285\tNC_000010.10\t96541616\t96541616\tG\tA\tsubstitution
`;

const EMPTY_START_FIXTURE = `Haplotype Name\tGene\trsID\tReferenceSequence\tVariant Start\tVariant Stop\tReference Allele\tVariant Allele\tType
CYP2C19*2.001\tCYP2C19\trs4244285\tNC_000010.10\t\t96541616\tG\tA\tsubstitution
`;

const EMPTY_STOP_FIXTURE = `Haplotype Name\tGene\trsID\tReferenceSequence\tVariant Start\tVariant Stop\tReference Allele\tVariant Allele\tType
CYP2C19*2.001\tCYP2C19\trs4244285\tNC_000010.10\t96541616\t\tG\tA\tsubstitution
`;

const NON_NUMERIC_FIXTURE = `Haplotype Name\tGene\trsID\tReferenceSequence\tVariant Start\tVariant Stop\tReference Allele\tVariant Allele\tType
CYP2C19*2.001\tCYP2C19\trs4244285\tNC_000010.10\tabc\txyz\tG\tA\tsubstitution
`;

const START_GT_STOP_FIXTURE = `Haplotype Name\tGene\trsID\tReferenceSequence\tVariant Start\tVariant Stop\tReference Allele\tVariant Allele\tType
CYP2C19*2.001\tCYP2C19\trs4244285\tNC_000010.10\t96542000\t96541616\tG\tA\tsubstitution
`;

const ZERO_NEGATIVE_FRACTIONAL_FIXTURE = `Haplotype Name\tGene\trsID\tReferenceSequence\tVariant Start\tVariant Stop\tReference Allele\tVariant Allele\tType
CYP2C19*2.001\tCYP2C19\trs4244285\tNC_000010.10\t0\t-5\tG\tA\tsubstitution
CYP2C19*2.002\tCYP2C19\trs4244285\tNC_000010.10\t1.5\t2.5\tG\tA\tsubstitution
`;

const BOTH_ALLELES_EMPTY_FIXTURE = `Haplotype Name\tGene\trsID\tReferenceSequence\tVariant Start\tVariant Stop\tReference Allele\tVariant Allele\tType
CYP2C19*X\tCYP2C19\t\tNC_000010.10\t96541616\t96541616\t\t\tsubstitution
`;

const INCONSISTENT_ALLELE_FIXTURE_1 = `Haplotype Name\tGene\trsID\tReferenceSequence\tVariant Start\tVariant Stop\tReference Allele\tVariant Allele\tType
CYP2C19*X\tCYP2C19\trs4244285\tNC_000010.10\t96541616\t96541616\tREFERENCE\tA\tsubstitution
`;

const INCONSISTENT_ALLELE_FIXTURE_2 = `Haplotype Name\tGene\trsID\tReferenceSequence\tVariant Start\tVariant Stop\tReference Allele\tVariant Allele\tType
CYP2C19*X\tCYP2C19\trs4244285\tNC_000010.10\t96541616\t96541616\tA\t.\tsubstitution
`;

const MISSING_GENE_FIXTURE = `Haplotype Name\tGene\trsID\tReferenceSequence\tVariant Start\tVariant Stop\tReference Allele\tVariant Allele\tType
CYP2C19*2.001\t\trs4244285\tNC_000010.10\t96541616\t96541616\tG\tA\tsubstitution
`;

const MISSING_ACCESSION_FIXTURE = `Haplotype Name\tGene\trsID\tReferenceSequence\tVariant Start\tVariant Stop\tReference Allele\tVariant Allele\tType
CYP2C19*2.001\tCYP2C19\trs4244285\t\t96541616\t96541616\tG\tA\tsubstitution
`;

const START_DOT_NON_REFERENCE_FIXTURE = `Haplotype Name\tGene\trsID\tReferenceSequence\tVariant Start\tVariant Stop\tReference Allele\tVariant Allele\tType
CYP2C19*X\tCYP2C19\t\tNC_000010.10\t.\t.\tA\t.\tsubstitution
`;

const CONTRADICTORY_REFERENCE_FIXTURE = `Haplotype Name\tGene\trsID\tReferenceSequence\tVariant Start\tVariant Stop\tReference Allele\tVariant Allele\tType
CYP2C19*X\tCYP2C19\t\tREFERENCE\t.\t.\tA\tT\tsubstitution
`;

describe('PharmVar Record Validator — Final Phase 2B.2 Coverage', () => {
  it('should validate valid records successfully', () => {
    const parseRes = parsePharmVarTsv(VALID_FIXTURE);
    const normRes = normalizePharmVarRecords(parseRes.rawRecords);
    const valRes = validatePharmVarData(parseRes.rawRecords, normRes.haplotypes);

    expect(valRes.isValid).toBe(true);
    expect(valRes.errors.length).toBe(0);
  });

  it('should not classify row as reference solely because variantStart is dot, preserving alleles and failing validation', () => {
    const parseRes = parsePharmVarTsv(START_DOT_NON_REFERENCE_FIXTURE);
    expect(parseRes.rawRecords[0].referenceAllele).toBe('A');
    expect(parseRes.rawRecords[0].variantAllele).toBe('.');

    const normRes = normalizePharmVarRecords(parseRes.rawRecords);
    const valRes = validatePharmVarData(parseRes.rawRecords, normRes.haplotypes);

    expect(valRes.isValid).toBe(false);
    expect(valRes.errors.some(e => e.code === 'INCONSISTENT_ALLELE_COMBINATION')).toBe(true);
  });

  it('should reject reference sentinel row with contradictory non-empty alleles', () => {
    const parseRes = parsePharmVarTsv(CONTRADICTORY_REFERENCE_FIXTURE);
    expect(parseRes.rawRecords[0].referenceAllele).toBe('A');
    expect(parseRes.rawRecords[0].variantAllele).toBe('T');

    const normRes = normalizePharmVarRecords(parseRes.rawRecords);
    const valRes = validatePharmVarData(parseRes.rawRecords, normRes.haplotypes);

    expect(valRes.isValid).toBe(false);
    expect(valRes.errors.some(e => e.code === 'INCONSISTENT_ALLELE_COMBINATION')).toBe(true);
  });

  it('should reject records with empty variant start coordinates', () => {
    const parseRes = parsePharmVarTsv(EMPTY_START_FIXTURE);
    const normRes = normalizePharmVarRecords(parseRes.rawRecords);
    const valRes = validatePharmVarData(parseRes.rawRecords, normRes.haplotypes);

    expect(valRes.isValid).toBe(false);
    expect(valRes.errors.some(e => e.code === 'EMPTY_START_COORDINATE')).toBe(true);
  });

  it('should reject records with empty variant stop coordinates', () => {
    const parseRes = parsePharmVarTsv(EMPTY_STOP_FIXTURE);
    const normRes = normalizePharmVarRecords(parseRes.rawRecords);
    const valRes = validatePharmVarData(parseRes.rawRecords, normRes.haplotypes);

    expect(valRes.isValid).toBe(false);
    expect(valRes.errors.some(e => e.code === 'EMPTY_STOP_COORDINATE')).toBe(true);
  });

  it('should reject records with non-numeric start and stop coordinates', () => {
    const parseRes = parsePharmVarTsv(NON_NUMERIC_FIXTURE);
    const normRes = normalizePharmVarRecords(parseRes.rawRecords);
    const valRes = validatePharmVarData(parseRes.rawRecords, normRes.haplotypes);

    expect(valRes.isValid).toBe(false);
    expect(valRes.errors.some(e => e.code === 'NON_NUMERIC_START')).toBe(true);
    expect(valRes.errors.some(e => e.code === 'NON_NUMERIC_STOP')).toBe(true);
  });

  it('should reject records where start is greater than stop', () => {
    const parseRes = parsePharmVarTsv(START_GT_STOP_FIXTURE);
    const normRes = normalizePharmVarRecords(parseRes.rawRecords);
    const valRes = validatePharmVarData(parseRes.rawRecords, normRes.haplotypes);

    expect(valRes.isValid).toBe(false);
    expect(valRes.errors.some(e => e.code === 'INVALID_COORDINATE_RANGE')).toBe(true);
  });

  it('should reject zero, negative, and fractional coordinates', () => {
    const parseRes = parsePharmVarTsv(ZERO_NEGATIVE_FRACTIONAL_FIXTURE);
    const normRes = normalizePharmVarRecords(parseRes.rawRecords);
    const valRes = validatePharmVarData(parseRes.rawRecords, normRes.haplotypes);

    expect(valRes.isValid).toBe(false);
    expect(valRes.errors.some(e => e.code === 'INVALID_START_COORDINATE' || e.code === 'INVALID_STOP_COORDINATE')).toBe(true);
  });

  it('should reject records where both alleles are empty', () => {
    const parseRes = parsePharmVarTsv(BOTH_ALLELES_EMPTY_FIXTURE);
    const normRes = normalizePharmVarRecords(parseRes.rawRecords);
    const valRes = validatePharmVarData(parseRes.rawRecords, normRes.haplotypes);

    expect(valRes.isValid).toBe(false);
    expect(valRes.errors.some(e => e.code === 'MALFORMED_EMPTY_ALLELES')).toBe(true);
  });

  it('should reject inconsistent reference/variant allele combinations', () => {
    const parseRes1 = parsePharmVarTsv(INCONSISTENT_ALLELE_FIXTURE_1);
    const normRes1 = normalizePharmVarRecords(parseRes1.rawRecords);
    const valRes1 = validatePharmVarData(parseRes1.rawRecords, normRes1.haplotypes);
    expect(valRes1.isValid).toBe(false);
    expect(valRes1.errors.some(e => e.code === 'INCONSISTENT_ALLELE_COMBINATION')).toBe(true);

    const parseRes2 = parsePharmVarTsv(INCONSISTENT_ALLELE_FIXTURE_2);
    const normRes2 = normalizePharmVarRecords(parseRes2.rawRecords);
    const valRes2 = validatePharmVarData(parseRes2.rawRecords, normRes2.haplotypes);
    expect(valRes2.isValid).toBe(false);
    expect(valRes2.errors.some(e => e.code === 'INCONSISTENT_ALLELE_COMBINATION')).toBe(true);
  });

  it('should reject missing gene symbol or missing reference sequence accession', () => {
    const parseRes1 = parsePharmVarTsv(MISSING_GENE_FIXTURE);
    const normRes1 = normalizePharmVarRecords(parseRes1.rawRecords);
    const valRes1 = validatePharmVarData(parseRes1.rawRecords, normRes1.haplotypes);
    expect(valRes1.isValid).toBe(false);
    expect(valRes1.errors.some(e => e.code === 'MISSING_GENE_SYMBOL')).toBe(true);

    const parseRes2 = parsePharmVarTsv(MISSING_ACCESSION_FIXTURE);
    const normRes2 = normalizePharmVarRecords(parseRes2.rawRecords);
    const valRes2 = validatePharmVarData(parseRes2.rawRecords, normRes2.haplotypes);
    expect(valRes2.isValid).toBe(false);
    expect(valRes2.errors.some(e => e.code === 'MISSING_REFERENCE_SEQUENCE')).toBe(true);
  });
});
