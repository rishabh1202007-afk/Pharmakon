/**
 * VCF Parsing Utilities
 * Extracted from VcfIntakePage for testability
 */

export interface ParsedVariant {
  rsid: string;
  evidence: string;
  chrom: string;
  pos: string;
  ref: string;
  alt: string;
  gene: string | null;
}

interface VariantRule {
  gene: string;
  diplotype: string;
  phenotype: string;
  impact: 'high' | 'medium' | 'low';
}

const VARIANT_RULES: Record<string, VariantRule> = {
  rs4244285: { gene: 'CYP2C19', diplotype: '*2/*2', phenotype: 'Poor Metabolizer', impact: 'high' },
  rs776746: { gene: 'CYP3A5', diplotype: '*3/*3', phenotype: 'Non-Expresser', impact: 'medium' },
  rs1799853: { gene: 'CYP2C9', diplotype: '*1/*2', phenotype: 'Intermediate Metabolizer', impact: 'medium' },
  rs1057910: { gene: 'CYP2C9', diplotype: '*1/*3', phenotype: 'Intermediate Metabolizer', impact: 'medium' },
  rs3892097: { gene: 'CYP2D6', diplotype: '*4/*4', phenotype: 'Poor Metabolizer', impact: 'high' },
  rs4149056: { gene: 'SLCO1B1', diplotype: 'c.521TC', phenotype: 'Decreased Function', impact: 'medium' },
};

export function parseInfoField(infoField: string): Record<string, string> {
  return infoField
    .split(';')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((accumulator, item) => {
      const [rawKey, ...valueParts] = item.split('=');
      if (!rawKey) {
        return accumulator;
      }

      const key = rawKey.trim().toUpperCase();
      const value = valueParts.join('=').trim();
      if (value) {
        accumulator[key] = value;
      }
      return accumulator;
    }, {});
}

export function parseVcfVariants(rawVcf: string): ParsedVariant[] {
  const lines = rawVcf.split(/\r?\n/);

  return lines
    .filter((line) => line.trim() && !line.startsWith('#'))
    .map((line) => line.split('\t'))
    .filter((parts) => parts.length >= 5)
    .map((parts) => {
      const [chrom, pos, id, ref, alt, , , info = ''] = parts;
      const normalizedRsid = id && id !== '.' ? id : `${chrom}:${pos}`;
      const infoMap = parseInfoField(info);
      const mappedRuleGene = VARIANT_RULES[normalizedRsid.toLowerCase()]?.gene ?? null;
      const parsedGene = infoMap.GENE || infoMap.GENE_SYMBOL || infoMap.SYMBOL || mappedRuleGene;

      return {
        rsid: normalizedRsid,
        evidence: `${chrom}:${pos} ${ref}>${alt}`,
        chrom,
        pos,
        ref,
        alt,
        gene: parsedGene ? parsedGene.toUpperCase() : null,
      };
    });
}

export function getVariantRule(rsid: string): VariantRule | undefined {
  return VARIANT_RULES[rsid.toLowerCase()];
}

export { VARIANT_RULES };
