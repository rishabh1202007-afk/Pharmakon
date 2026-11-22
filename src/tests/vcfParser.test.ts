import { describe, it, expect } from 'vitest';
import {
  parseVcfVariants,
  parseInfoField,
  getVariantRule,
} from '../utils/vcfParser';

describe('VCF Parser', () => {
  describe('parseInfoField', () => {
    it('should parse simple INFO field with single key=value', () => {
      const result = parseInfoField('GENE=CYP2C19');
      expect(result.GENE).toBe('CYP2C19');
    });

    it('should parse multiple semicolon-separated values', () => {
      const result = parseInfoField('GENE=CYP2C19;SYMBOL=CYP2C19;AC=100');
      expect(result.GENE).toBe('CYP2C19');
      expect(result.SYMBOL).toBe('CYP2C19');
      expect(result.AC).toBe('100');
    });

    it('should handle empty INFO field', () => {
      const result = parseInfoField('');
      expect(Object.keys(result).length).toBe(0);
    });

    it('should handle malformed INFO field with missing values', () => {
      const result = parseInfoField('GENE=;SYMBOL=CYP2C19');
      expect(result.GENE).toBeUndefined();
      expect(result.SYMBOL).toBe('CYP2C19');
    });

    it('should normalize keys to uppercase', () => {
      const result = parseInfoField('gene=CYP2C19;symbol=CYP2C19');
      expect(result.GENE).toBe('CYP2C19');
      expect(result.SYMBOL).toBe('CYP2C19');
    });
  });

  describe('parseVcfVariants', () => {
    it('should parse valid VCF records', () => {
      const vcf = `##fileformat=VCFv4.1
#CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO
1	97788920	rs4244285	A	G	.	PASS	GENE=CYP2C19`;

      const variants = parseVcfVariants(vcf);
      expect(variants.length).toBe(1);
      expect(variants[0].rsid).toBe('rs4244285');
      expect(variants[0].chrom).toBe('1');
      expect(variants[0].pos).toBe('97788920');
      expect(variants[0].ref).toBe('A');
      expect(variants[0].alt).toBe('G');
      expect(variants[0].gene).toBe('CYP2C19');
      expect(variants[0].evidence).toBe('1:97788920 A>G');
    });

    it('should handle missing RSID by creating chrom:pos identifier', () => {
      const vcf = `##fileformat=VCFv4.1
#CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO
1	97788920	.	A	G	.	PASS	`;

      const variants = parseVcfVariants(vcf);
      expect(variants.length).toBe(1);
      expect(variants[0].rsid).toBe('1:97788920');
    });

    it('should infer gene from variant rule when INFO.GENE missing', () => {
      const vcf = `##fileformat=VCFv4.1
#CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO
4	97788920	rs4244285	A	G	.	PASS	`;

      const variants = parseVcfVariants(vcf);
      expect(variants.length).toBe(1);
      expect(variants[0].gene).toBe('CYP2C19');
    });

    it('should handle gene from INFO.GENE_SYMBOL field', () => {
      const vcf = `##fileformat=VCFv4.1
#CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO
1	97788920	rs_unknown	A	G	.	PASS	GENE_SYMBOL=CYP2D6`;

      const variants = parseVcfVariants(vcf);
      expect(variants[0].gene).toBe('CYP2D6');
    });

    it('should handle multiple variant records', () => {
      const vcf = `##fileformat=VCFv4.1
#CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO
1	97788920	rs4244285	A	G	.	PASS
2	120000000	rs1799853	C	T	.	PASS	GENE=CYP2C9
3	150000000	.	G	A	.	PASS	`;

      const variants = parseVcfVariants(vcf);
      expect(variants.length).toBe(3);
      expect(variants[0].rsid).toBe('rs4244285');
      expect(variants[1].rsid).toBe('rs1799853');
      expect(variants[2].rsid).toBe('3:150000000');
    });

    it('should filter out comment lines', () => {
      const vcf = `##fileformat=VCFv4.1
##reference=GRCh37
#CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO
1	97788920	rs4244285	A	G	.	PASS	`;

      const variants = parseVcfVariants(vcf);
      expect(variants.length).toBe(1);
    });

    it('should handle empty VCF (no variants)', () => {
      const vcf = `##fileformat=VCFv4.1
#CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO`;

      const variants = parseVcfVariants(vcf);
      expect(variants.length).toBe(0);
    });

    it('should handle malformed records with insufficient columns', () => {
      const vcf = `##fileformat=VCFv4.1
#CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO
1	97788920	rs4244285	A
1	97788920	rs1799853	C	T	.	PASS	`;

      const variants = parseVcfVariants(vcf);
      expect(variants.length).toBe(1);
      expect(variants[0].rsid).toBe('rs1799853');
    });

    it('should set gene to null when not found in rule or INFO', () => {
      const vcf = `##fileformat=VCFv4.1
#CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO
1	1000000	rs_unknown	A	G	.	PASS	`;

      const variants = parseVcfVariants(vcf);
      expect(variants[0].gene).toBeNull();
    });

    it('should handle multiple alternate alleles', () => {
      const vcf = `##fileformat=VCFv4.1
#CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO
1	97788920	rs4244285	A	G,T	.	PASS	`;

      const variants = parseVcfVariants(vcf);
      expect(variants.length).toBe(1);
      expect(variants[0].alt).toBe('G,T');
    });
  });

  describe('getVariantRule', () => {
    it('should return rule for known RSID', () => {
      const rule = getVariantRule('rs4244285');
      expect(rule).toBeDefined();
      expect(rule?.gene).toBe('CYP2C19');
      expect(rule?.phenotype).toBe('Poor Metabolizer');
      expect(rule?.impact).toBe('high');
    });

    it('should handle case-insensitive RSID lookup', () => {
      const rule1 = getVariantRule('rs4244285');
      const rule2 = getVariantRule('RS4244285');
      expect(rule1).toEqual(rule2);
    });

    it('should return undefined for unknown RSID', () => {
      const rule = getVariantRule('rs_unknown_12345');
      expect(rule).toBeUndefined();
    });

    it('should return correct rule for CYP2C9 variant', () => {
      const rule = getVariantRule('rs1799853');
      expect(rule?.gene).toBe('CYP2C9');
      expect(rule?.diplotype).toBe('*1/*2');
      expect(rule?.phenotype).toBe('Intermediate Metabolizer');
    });
  });
});
