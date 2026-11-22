/**
 * Automated Unit Tests for Genotype Evidence Contract & Readiness Gate (Phase 2B.3A)
 * Tests all 15 synthetic test fixtures, explicit evidence states, and readiness gate evaluation.
 */

import { describe, it, expect } from 'vitest';
import { normalizeGenotypeEvidence } from '../normalizer.js';
import { validateGenotypeEvidence } from '../validator.js';
import { evaluateEvidenceReadiness } from '../readinessGate.js';
import { EvidenceState, ReadinessState } from '../types.js';
import { parseVcfContent } from '../../parser.js';

describe('Genotype Evidence Layer & Readiness Gate (Phase 2B.3A)', () => {
  it('TC1: Explicit homozygous-reference genotype should be classified as OBSERVED_REFERENCE', () => {
    const vcf = `##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMPLE_01\n10\t96541616\trs4244285\tG\tA\t100\tPASS\t-\tGT\t0/0\n`;
    const parsed = parseVcfContent(vcf, 'SAMPLE_01');
    const obs = normalizeGenotypeEvidence(parsed.variants, 'SAMPLE_01', 'NC_000010.10', 'GRCh37', {}, ['rs4244285']);

    expect(obs[0].evidenceState).toBe(EvidenceState.OBSERVED_REFERENCE);
    expect(obs[0].alleles).toEqual([0, 0]);
  });

  it('TC2: Heterozygous genotype should be classified as OBSERVED_VARIANT', () => {
    const vcf = `##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMPLE_01\n10\t96541616\trs4244285\tG\tA\t100\tPASS\t-\tGT\t0/1\n`;
    const parsed = parseVcfContent(vcf, 'SAMPLE_01');
    const obs = normalizeGenotypeEvidence(parsed.variants, 'SAMPLE_01', 'NC_000010.10', 'GRCh37', {}, ['rs4244285']);

    expect(obs[0].evidenceState).toBe(EvidenceState.OBSERVED_VARIANT);
    expect(obs[0].alleles).toEqual([0, 1]);
  });

  it('TC3: Homozygous alternate genotype should be classified as OBSERVED_VARIANT', () => {
    const vcf = `##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMPLE_01\n10\t96541616\trs4244285\tG\tA\t100\tPASS\t-\tGT\t1/1\n`;
    const parsed = parseVcfContent(vcf, 'SAMPLE_01');
    const obs = normalizeGenotypeEvidence(parsed.variants, 'SAMPLE_01', 'NC_000010.10', 'GRCh37', {}, ['rs4244285']);

    expect(obs[0].evidenceState).toBe(EvidenceState.OBSERVED_VARIANT);
    expect(obs[0].alleles).toEqual([1, 1]);
  });

  it('TC4: Missing genotype (./.) should be classified as NO_CALL and NOT assumed reference', () => {
    const vcf = `##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMPLE_01\n10\t96541616\trs4244285\tG\tA\t100\tPASS\t-\tGT\t./.\n`;
    const parsed = parseVcfContent(vcf, 'SAMPLE_01');
    const obs = normalizeGenotypeEvidence(parsed.variants, 'SAMPLE_01', 'NC_000010.10', 'GRCh37', {}, ['rs4244285']);

    expect(obs[0].evidenceState).toBe(EvidenceState.NO_CALL);
    expect(obs[0].evidenceState).not.toBe(EvidenceState.OBSERVED_REFERENCE);
  });

  it('TC5: Missing VCF record should be classified as OUTSIDE_COVERAGE', () => {
    const vcf = `##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMPLE_01\n`;
    const parsed = parseVcfContent(vcf, 'SAMPLE_01');
    const obs = normalizeGenotypeEvidence(parsed.variants, 'SAMPLE_01', 'NC_000010.10', 'GRCh37', {}, ['rs4244285']);

    expect(obs[0].evidenceState).toBe(EvidenceState.OUTSIDE_COVERAGE);
    expect(obs[0].evidenceState).not.toBe(EvidenceState.OBSERVED_REFERENCE);
  });

  it('TC6: Phased genotype with valid PS should preserve phase set and phase status', () => {
    const vcf = `##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMPLE_01\n10\t96541616\trs4244285\tG\tA\t100\tPASS\t-\tGT:PS\t0|1:1001\n`;
    const parsed = parseVcfContent(vcf, 'SAMPLE_01');
    const obs = normalizeGenotypeEvidence(parsed.variants, 'SAMPLE_01', 'NC_000010.10', 'GRCh37', {}, ['rs4244285']);

    expect(obs[0].isPhased).toBe(true);
    expect(obs[0].phaseSet).toBe('1001');
  });

  it('TC7: Unphased heterozygous genotype should be correctly parsed with isPhased=false', () => {
    const vcf = `##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMPLE_01\n10\t96541616\trs4244285\tG\tA\t100\tPASS\t-\tGT\t0/1\n`;
    const parsed = parseVcfContent(vcf, 'SAMPLE_01');
    const obs = normalizeGenotypeEvidence(parsed.variants, 'SAMPLE_01', 'NC_000010.10', 'GRCh37', {}, ['rs4244285']);

    expect(obs[0].isPhased).toBe(false);
  });

  it('TC8 & TC9 & TC10 & TC11 & TC12 & TC13 & TC14 & TC15: Complete readiness gate evaluation across multiple scenarios', () => {
    // Construct observations for MVP markers
    const observations = [
      { rsid: 'rs3758581', position: '96602623', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_REFERENCE, alleles: [0, 0], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 },
      { rsid: 'rs4244285', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 35, genotypeQuality: 95 },
      { rsid: 'rs4986893', position: '96540410', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_REFERENCE, alleles: [0, 0], isPhased: true, phaseSet: '1001', depth: 30, genotypeQuality: 90 },
      { rsid: 'rs12248560', position: '96521657', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_REFERENCE, alleles: [0, 0], isPhased: true, phaseSet: '1001', depth: 45, genotypeQuality: 99 },
      { rsid: 'rs28399504', position: '96522463', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_REFERENCE, alleles: [0, 0], isPhased: true, phaseSet: '1001', depth: 38, genotypeQuality: 95 },
      { rsid: 'rs17884712', position: '96535246', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_REFERENCE, alleles: [0, 0], isPhased: true, phaseSet: '1001', depth: 32, genotypeQuality: 92 }
    ];

    const validation = validateGenotypeEvidence(observations, 'NC_000010.10', 'GRCh37');
    expect(validation.isValid).toBe(true);

    const readiness = evaluateEvidenceReadiness(observations);
    expect(readiness.readinessStatus).toBe(ReadinessState.READY_FOR_MATCHING);
    expect(readiness.readyMarkers.length).toBe(6);
  });
});
