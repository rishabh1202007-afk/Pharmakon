/**
 * Automated Unit Tests for CYP2C19 Haplotype Matching Prototype (Phase 2B.3B Final Centralized Marker Resolution)
 * Tests all required regression scenarios including multiallelic allele mapping,
 * phase coherence (cis/trans), sample isolation, phase-set completeness, centralized marker resolution,
 * optional-identifier handling, reference haplotype coordinate resolution, multi-observation validation,
 * valid reference allele evidence, and strict INVALID_EVIDENCE rejection.
 */

import { describe, it, expect } from 'vitest';
import { matchSyntheticEvidenceToHaplotypes } from '../matcher.js';
import { PharmVarIndexer } from '../../pharmvar/indexer.js';
import { EvidenceState } from '../../evidence/types.js';
import { CYP2C19_MVP_MARKERS } from '../../types.js';

function createMockIndexer() {
  const indexer = new PharmVarIndexer();
  const mockHaplotypes = [
    {
      haplotypeId: 'CYP2C19*1',
      coreAllele: 'CYP2C19*1',
      subAlleles: null,
      gene: 'CYP2C19',
      referenceSequence: 'NC_000010.10',
      variants: [],
      isReferenceHaplotype: true,
      sourceRowNumber: 1
    },
    {
      haplotypeId: 'CYP2C19*2.001',
      coreAllele: 'CYP2C19*2',
      subAlleles: '.001',
      gene: 'CYP2C19',
      referenceSequence: 'NC_000010.10',
      variants: [
        { rsid: 'rs4244285', referenceSequence: 'NC_000010.10', start: 96541616, end: 96541616, referenceAllele: 'G', variantAllele: 'A', variantType: 'substitution', isReference: false }
      ],
      isReferenceHaplotype: false,
      sourceRowNumber: 2
    },
    {
      haplotypeId: 'CYP2C19*3.001',
      coreAllele: 'CYP2C19*3',
      subAlleles: '.001',
      gene: 'CYP2C19',
      referenceSequence: 'NC_000010.10',
      variants: [
        { rsid: 'rs4986893', referenceSequence: 'NC_000010.10', start: 96540410, end: 96540410, referenceAllele: 'G', variantAllele: 'A', variantType: 'substitution', isReference: false }
      ],
      isReferenceHaplotype: false,
      sourceRowNumber: 3
    },
    {
      haplotypeId: 'CYP2C19*complex.multi',
      coreAllele: 'CYP2C19*complex',
      subAlleles: '.001',
      gene: 'CYP2C19',
      referenceSequence: 'NC_000010.10',
      variants: [
        { rsid: 'rs4244285', referenceSequence: 'NC_000010.10', start: 96541616, end: 96541616, referenceAllele: 'G', variantAllele: 'A', variantType: 'substitution', isReference: false },
        { rsid: 'rs4986893', referenceSequence: 'NC_000010.10', start: 96540410, end: 96540410, referenceAllele: 'G', variantAllele: 'A', variantType: 'substitution', isReference: false }
      ],
      isReferenceHaplotype: false,
      sourceRowNumber: 4
    }
  ];
  indexer.buildIndexes(mockHaplotypes);
  return indexer;
}

describe('CYP2C19 Haplotype Matching Prototype (Phase 2B.3B Final Centralized Marker Resolution)', () => {
  const indexer = createMockIndexer();

  // --- Original 9 Tests ---

  it('1. Exact matching haplotype is returned as evidence-supported', () => {
    const observations = [
      { rsid: 'rs4244285', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 35, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(true);
    const star2 = result.candidates.find(c => c.haplotypeId === 'CYP2C19*2.001');
    expect(star2).toBeDefined();
    expect(star2.matchCategory).toBe('SUPPORTED');
    expect(star2.technicalCoverageMetric).toBe(1.0);
  });

  it('2. Multiple possible candidates remain distinguishable', () => {
    const observations = [
      { rsid: 'rs4244285', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 35, genotypeQuality: 99 },
      { rsid: 'rs4986893', position: '96540410', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 30, genotypeQuality: 95 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(true);
    const star2 = result.candidates.find(c => c.haplotypeId === 'CYP2C19*2.001');
    const star3 = result.candidates.find(c => c.haplotypeId === 'CYP2C19*3.001');
    expect(star2.matchCategory).toBe('SUPPORTED');
    expect(star3.matchCategory).toBe('SUPPORTED');
  });

  it('3. A haplotype with an explicit contradictory genotype is excluded from supported candidates', () => {
    const observations = [
      { rsid: 'rs4244285', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_REFERENCE, refAllele: 'G', altAllele: 'A', alleles: [0, 0], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(true);
    const star2 = result.candidates.find(c => c.haplotypeId === 'CYP2C19*2.001');
    expect(star2.matchCategory).toBe('EXCLUDED');
    expect(star2.mismatchCount).toBe(1);
  });

  it('4. A haplotype with missing evidence is classified as unresolved, not confirmed', () => {
    const observations = [
      { rsid: 'rs4244285', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.NO_CALL, refAllele: 'G', altAllele: 'A', alleles: [], isPhased: false, phaseSet: null, depth: 0, genotypeQuality: 0 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(true);
    const star2 = result.candidates.find(c => c.haplotypeId === 'CYP2C19*2.001');
    expect(star2.matchCategory).toBe('UNRESOLVED');
    expect(star2.missingCount).toBe(1);
  });

  it('5. Absent VCF records never establish homozygous reference or confirmed matches', () => {
    const observations = [
      { rsid: 'rs4244285', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OUTSIDE_COVERAGE, refAllele: 'G', altAllele: 'A', alleles: [], isPhased: false, phaseSet: null, depth: null, genotypeQuality: null }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(true);
    const refHap = result.candidates.find(c => c.haplotypeId === 'CYP2C19*1');
    expect(refHap.matchCategory).toBe('UNRESOLVED');
  });

  it('6. Wrong alternate allele is rejected as mismatch', () => {
    const observations = [
      { rsid: 'rs4244285', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'T', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 35, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(true);
    const star2 = result.candidates.find(c => c.haplotypeId === 'CYP2C19*2.001');
    expect(star2.matchCategory).toBe('EXCLUDED');
    expect(star2.mismatchCount).toBe(1);
  });

  it('7. Unphased and inconsistent phase-set evidence records technical uncertainty', () => {
    const observations = [
      { rsid: 'rs4244285', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: false, phaseSet: null, depth: 35, genotypeQuality: 95 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(true);
    expect(result.uncertaintyReasons.some(r => r.includes('Unphased'))).toBe(true);
  });

  it('8. Build mismatch fails safely with ASSEMBLY_MISMATCH status', () => {
    const observations = [
      { rsid: 'rs4244285', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh38', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 35, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(false);
    expect(result.status).toBe('ASSEMBLY_MISMATCH');
  });

  it('9. Reference accession mismatch fails safely with ACCESSION_MISMATCH status', () => {
    const observations = [
      { rsid: 'rs4244285', position: '96541616', chromosome: '10', accession: 'NC_000010.11', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 35, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(false);
    expect(result.status).toBe('ACCESSION_MISMATCH');
  });

  // --- Prior Regression Tests & Corrected Optional-Identifier Tests (28 & 29) ---

  it('10. Multiallelic ALT index 1 maps to the correct allele', () => {
    const observations = [
      { rsid: 'rs4244285', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'C,A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(true);
    const star2 = result.candidates.find(c => c.haplotypeId === 'CYP2C19*2.001');
    expect(star2.matchCategory).toBe('EXCLUDED');
  });

  it('11. Multiallelic ALT index 2 maps to the correct allele', () => {
    const observations = [
      { rsid: 'rs4244285', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'C,A', alleles: [0, 2], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(true);
    const star2 = result.candidates.find(c => c.haplotypeId === 'CYP2C19*2.001');
    expect(star2.matchCategory).toBe('SUPPORTED');
  });

  it('12. Wrong ALT index is excluded as mismatch', () => {
    const observations = [
      { rsid: 'rs4244285', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'C,A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(true);
    const star2 = result.candidates.find(c => c.haplotypeId === 'CYP2C19*2.001');
    expect(star2.matchCategory).toBe('EXCLUDED');
  });

  it('13. Out-of-range genotype allele index returns INVALID_EVIDENCE status', () => {
    const observations = [
      { rsid: 'rs4244285', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 5], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(false);
    expect(result.status).toBe('INVALID_EVIDENCE');
  });

  it('14. Two defining variants phased on the same chromosome copy (cis) with same PS are supported', () => {
    const observations = [
      { rsid: 'rs4244285', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 },
      { rsid: 'rs4986893', position: '96540410', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(true);
    const complexHap = result.candidates.find(c => c.haplotypeId === 'CYP2C19*complex.multi');
    expect(complexHap.matchCategory).toBe('SUPPORTED');
  });

  it('15. Two defining variants phased on opposite chromosome copies (trans) are excluded', () => {
    const observations = [
      { rsid: 'rs4244285', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 },
      { rsid: 'rs4986893', position: '96540410', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [1, 0], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(true);
    const complexHap = result.candidates.find(c => c.haplotypeId === 'CYP2C19*complex.multi');
    expect(complexHap.matchCategory).toBe('EXCLUDED');
  });

  it('16. Unphased defining variants for multi-variant haplotype are UNRESOLVED and never SUPPORTED', () => {
    const observations = [
      { rsid: 'rs4244285', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: false, phaseSet: null, depth: 40, genotypeQuality: 99 },
      { rsid: 'rs4986893', position: '96540410', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: false, phaseSet: null, depth: 40, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(true);
    const complexHap = result.candidates.find(c => c.haplotypeId === 'CYP2C19*complex.multi');
    expect(complexHap.matchCategory).toBe('UNRESOLVED');
    expect(complexHap.matchCategory).not.toBe('SUPPORTED');
  });

  it('17. Different phase sets result in UNRESOLVED status', () => {
    const observations = [
      { rsid: 'rs4244285', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 },
      { rsid: 'rs4986893', position: '96540410', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '2002', depth: 40, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(true);
    const complexHap = result.candidates.find(c => c.haplotypeId === 'CYP2C19*complex.multi');
    expect(complexHap.matchCategory).toBe('UNRESOLVED');
  });

  it('18. Different sample IDs cannot be combined and fail with INVALID_EVIDENCE status', () => {
    const observations = [
      { rsid: 'rs4244285', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'SAMPLE_A', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 },
      { rsid: 'rs4986893', position: '96540410', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'SAMPLE_B', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(false);
    expect(result.status).toBe('INVALID_EVIDENCE');
  });

  it('19. Missing sample identity fails safely with INVALID_EVIDENCE status', () => {
    const observations = [
      { rsid: 'rs4244285', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: '', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(false);
    expect(result.status).toBe('INVALID_EVIDENCE');
  });

  it('20. Mixed valid and missing sample identity returns INVALID_EVIDENCE', () => {
    const observations = [
      { rsid: 'rs4244285', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'SAMPLE_A', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 },
      { rsid: 'rs4986893', position: '96540410', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: '', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(false);
    expect(result.status).toBe('INVALID_EVIDENCE');
  });

  it('21. Alternate allele observed on both chromosome copies tracks all matching indices', () => {
    const observations = [
      { rsid: 'rs4244285', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [1, 1], isPhased: true, phaseSet: '1001', depth: 50, genotypeQuality: 99 },
      { rsid: 'rs4986893', position: '96540410', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [1, 1], isPhased: true, phaseSet: '1001', depth: 50, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(true);
    const complexHap = result.candidates.find(c => c.haplotypeId === 'CYP2C19*complex.multi');
    expect(complexHap.matchCategory).toBe('SUPPORTED');
  });

  it('22. One observation has PS and another has no PS results in UNRESOLVED status', () => {
    const observations = [
      { rsid: 'rs4244285', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 },
      { rsid: 'rs4986893', position: '96540410', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: null, depth: 40, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(true);
    const complexHap = result.candidates.find(c => c.haplotypeId === 'CYP2C19*complex.multi');
    expect(complexHap.matchCategory).toBe('UNRESOLVED');
  });

  it('23. Neither observation has a PS results in UNRESOLVED status', () => {
    const observations = [
      { rsid: 'rs4244285', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: null, depth: 40, genotypeQuality: 99 },
      { rsid: 'rs4986893', position: '96540410', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: null, depth: 40, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(true);
    const complexHap = result.candidates.find(c => c.haplotypeId === 'CYP2C19*complex.multi');
    expect(complexHap.matchCategory).toBe('UNRESOLVED');
  });

  it('24. Matching rsID with incorrect genomic position returns INVALID_EVIDENCE status', () => {
    const observations = [
      { rsid: 'rs4244285', position: '99999999', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(false);
    expect(result.status).toBe('INVALID_EVIDENCE');
  });

  it('25. Matching ALT allele with inconsistent VCF REF allele returns INVALID_EVIDENCE status', () => {
    const observations = [
      { rsid: 'rs4244285', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'C', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(false);
    expect(result.status).toBe('INVALID_EVIDENCE');
  });

  it('26. Incorrect rsID with otherwise matching genomic position returns INVALID_EVIDENCE status', () => {
    const observations = [
      { rsid: 'rs999999', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(false);
    expect(result.status).toBe('INVALID_EVIDENCE');
  });

  it('27. Missing REF allele with otherwise matching ALT allele returns INVALID_EVIDENCE status', () => {
    const observations = [
      { rsid: 'rs4244285', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: '', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(false);
    expect(result.status).toBe('INVALID_EVIDENCE');
  });

  it('28. Fully defined PharmVar marker with observation missing rsID allows matching and returns SUPPORTED', () => {
    const observations = [
      { rsid: '.', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(true);
    const star2 = result.candidates.find(c => c.haplotypeId === 'CYP2C19*2.001');
    expect(star2.matchCategory).toBe('SUPPORTED');
  });

  it('29. Fully defined PharmVar marker with observation missing position allows matching and returns SUPPORTED', () => {
    const observations = [
      { rsid: 'rs4244285', position: '', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(true);
    const star2 = result.candidates.find(c => c.haplotypeId === 'CYP2C19*2.001');
    expect(star2.matchCategory).toBe('SUPPORTED');
  });

  it('30. Both identifiers missing in observation returns INVALID_EVIDENCE status', () => {
    const observations = [
      { rsid: '', position: '', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(false);
    expect(result.status).toBe('INVALID_EVIDENCE');
  });

  it('31. Conflicting identifiers return INVALID_EVIDENCE status', () => {
    const observations = [
      { rsid: 'rs4244285', position: '99999999', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(false);
    expect(result.status).toBe('INVALID_EVIDENCE');
  });

  it('32. Split identifiers across two observations return INVALID_EVIDENCE status', () => {
    const observations = [
      { rsid: 'rs4244285', position: '11111111', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 },
      { rsid: 'rs9999999', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(false);
    expect(result.status).toBe('INVALID_EVIDENCE');
  });

  it('33. Required reference marker with missing rsID but valid coordinate is recognized as OBSERVED_REFERENCE (Section 1)', () => {
    const customIndexer = new PharmVarIndexer();
    customIndexer.buildIndexes([
      {
        haplotypeId: 'CYP2C19*1',
        coreAllele: 'CYP2C19*1',
        subAlleles: null,
        gene: 'CYP2C19',
        referenceSequence: 'NC_000010.10',
        variants: [],
        isReferenceHaplotype: true,
        sourceRowNumber: 1
      }
    ]);
    const observations = CYP2C19_MVP_MARKERS.map(m => ({
      rsid: '.',
      position: m.pos,
      chromosome: '10',
      accession: 'NC_000010.10',
      referenceBuild: 'GRCh37',
      sampleId: 'S1',
      evidenceState: EvidenceState.OBSERVED_REFERENCE,
      refAllele: 'G',
      altAllele: 'A',
      alleles: [0, 0],
      isPhased: true,
      phaseSet: '1001',
      depth: 40,
      genotypeQuality: 99
    }));
    const result = matchSyntheticEvidenceToHaplotypes(observations, customIndexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(true);
    const refHap = result.candidates.find(c => c.haplotypeId === 'CYP2C19*1');
    expect(refHap.matchCategory).toBe('SUPPORTED');
  });

  it('34. Absent marker cannot establish reference status for reference haplotype (Section 1)', () => {
    const customIndexer = new PharmVarIndexer();
    customIndexer.buildIndexes([
      {
        haplotypeId: 'CYP2C19*1',
        coreAllele: 'CYP2C19*1',
        subAlleles: null,
        gene: 'CYP2C19',
        referenceSequence: 'NC_000010.10',
        variants: [],
        isReferenceHaplotype: true,
        sourceRowNumber: 1
      }
    ]);
    const observations = [
      { rsid: 'rs3758581', position: '96602623', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OUTSIDE_COVERAGE, refAllele: 'N', altAllele: 'N', alleles: [], isPhased: false, phaseSet: null, depth: null, genotypeQuality: null }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, customIndexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(true);
    const refHap = result.candidates.find(c => c.haplotypeId === 'CYP2C19*1');
    expect(refHap.matchCategory).toBe('UNRESOLVED');
  });

  it('35. Multiple observations where a later observation has both rsID and position missing returns INVALID_EVIDENCE (Section 2)', () => {
    const observations = [
      { rsid: 'rs4244285', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 },
      { rsid: '', position: '', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(false);
    expect(result.status).toBe('INVALID_EVIDENCE');
  });

  it('36. Correct rsID-only observation and correct coordinate-only observation split across two records return INVALID_EVIDENCE', () => {
    const observations = [
      { rsid: 'rs4244285', position: '', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 },
      { rsid: '.', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(false);
    expect(result.status).toBe('INVALID_EVIDENCE');
    expect(result.candidates).toEqual([]);
  });

  it('37. Two observations both matching the same marker identity return INVALID_EVIDENCE', () => {
    const observations = [
      { rsid: 'rs4244285', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 },
      { rsid: 'rs4244285', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(false);
    expect(result.status).toBe('INVALID_EVIDENCE');
    expect(result.candidates).toEqual([]);
  });

  // --- New Tests 38, 39, 40 (Duplicate Partial-Match Ambiguity Rejections) ---

  it('38. Two observations with the same valid rsID but missing coordinates return INVALID_EVIDENCE', () => {
    const observations = [
      { rsid: 'rs4244285', position: '', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 },
      { rsid: 'rs4244285', position: '', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(false);
    expect(result.status).toBe('INVALID_EVIDENCE');
    expect(result.candidates).toEqual([]);
  });

  it('39. Two observations with the same valid coordinate but missing rsIDs return INVALID_EVIDENCE', () => {
    const observations = [
      { rsid: '.', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 },
      { rsid: '.', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(false);
    expect(result.status).toBe('INVALID_EVIDENCE');
    expect(result.candidates).toEqual([]);
  });

  it('40. A strict full-identity match plus another partial observation identifying the same marker returns INVALID_EVIDENCE', () => {
    const observations = [
      { rsid: 'rs4244285', position: '96541616', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 },
      { rsid: 'rs4244285', position: '', chromosome: '10', accession: 'NC_000010.10', referenceBuild: 'GRCh37', sampleId: 'S1', evidenceState: EvidenceState.OBSERVED_VARIANT, refAllele: 'G', altAllele: 'A', alleles: [0, 1], isPhased: true, phaseSet: '1001', depth: 40, genotypeQuality: 99 }
    ];
    const result = matchSyntheticEvidenceToHaplotypes(observations, indexer, 'NC_000010.10', 'GRCh37');
    expect(result.success).toBe(false);
    expect(result.status).toBe('INVALID_EVIDENCE');
    expect(result.candidates).toEqual([]);
  });
});
