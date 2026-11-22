/**
 * Automated Unit Tests for CYP2C19 Backend Scaffolding (Phase 2B.1 Hardened)
 * Tests VCF parsing, multisample selection, GT & PS extraction, and callability.
 */

import { describe, it, expect } from 'vitest';
import { parseVcfContent, parseGenotypeCall, parseInfoField } from '../parser.js';
import { CYP2C19_MVP_MARKERS } from '../types.js';

const SYNTHETIC_VCF_FIXTURE = `##fileformat=VCFv4.2
##fileDate=20261122
##reference=GRCh37
#CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO	FORMAT	SAMPLE_A	SAMPLE_B
10	96541616	rs4244285	G	A	100	PASS	GENE=CYP2C19	GT:PS:DP:GQ	0|1:1001:35:99	1/1:.:40:95
10	96540410	rs4986893	G	A	100	PASS	GENE=CYP2C19	GT:PS:DP:GQ	0|0:1001:30:90	./.:.:0:0
`;

describe('CYP2C19 Backend VCF Parser Scaffolding (Phase 2B.1 Hardened)', () => {
  it('should parse INFO fields correctly', () => {
    const info = parseInfoField('GENE=CYP2C19;SYMBOL=CYP2C19;AC=100');
    expect(info.GENE).toBe('CYP2C19');
    expect(info.SYMBOL).toBe('CYP2C19');
    expect(info.AC).toBe('100');
  });

  it('should parse genotype calls with GT, PS, DP, and GQ fields', () => {
    const callA = parseGenotypeCall('GT:PS:DP:GQ', '0|1:1001:35:99', 'SAMPLE_A');
    expect(callA.sampleId).toBe('SAMPLE_A');
    expect(callA.rawGt).toBe('0|1');
    expect(callA.alleles).toEqual([0, 1]);
    expect(callA.isPhased).toBe(true);
    expect(callA.isMissing).toBe(false);
    expect(callA.phaseSet).toBe('1001');
    expect(callA.depth).toBe(35);
    expect(callA.genotypeQuality).toBe(99);

    const callMissing = parseGenotypeCall('GT:PS:DP:GQ', './.:.:0:0', 'SAMPLE_B');
    expect(callMissing.isMissing).toBe(true);
    expect(callMissing.alleles).toEqual([]);
    expect(callMissing.phaseSet).toBeNull();
  });

  it('should parse multisample VCF and handle sample selection', () => {
    const result = parseVcfContent(SYNTHETIC_VCF_FIXTURE, 'SAMPLE_A');
    expect(result.success).toBe(true);
    expect(result.metadata.sampleIds).toEqual(['SAMPLE_A', 'SAMPLE_B']);
    expect(result.metadata.totalVariants).toBe(2);
    expect(result.selectedSampleGenotypes).toBeDefined();
    expect(result.selectedSampleGenotypes['rs4244285'].rawGt).toBe('0|1');
    expect(result.selectedSampleGenotypes['rs4244285'].phaseSet).toBe('1001');
    expect(result.selectedSampleGenotypes['rs4244285'].depth).toBe(35);
  });

  it('should evaluate technical callability with unvalidated metrics and assumesReference: false', () => {
    const result = parseVcfContent(SYNTHETIC_VCF_FIXTURE, 'SAMPLE_A');
    expect(result.provenance.callability.assumesReference).toBe(false);
    expect(result.provenance.callability.technicalCallabilityStatus).toBeDefined();
    expect(Array.isArray(result.provenance.callability.markersAnalyzed)).toBe(true);
    expect(result.provenance.callability.rawQualityMetrics['rs4244285'].depth).toBe(35);
    expect(result.provenance.uncertaintyFlags).toContain('CLINICAL_ASSAY_CALLABILITY_UNVALIDATED');
  });

  it('should use MVP markers subset rather than claiming complete star-allele coverage', () => {
    expect(CYP2C19_MVP_MARKERS.length).toBe(6);
    expect(CYP2C19_MVP_MARKERS.some(m => m.rsid === 'rs4244285')).toBe(true);
  });

  it('should handle invalid or empty VCF gracefully', () => {
    const result = parseVcfContent('');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.variants).toEqual([]);
  });
});
