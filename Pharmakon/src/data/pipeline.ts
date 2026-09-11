export const pipeline = [
  {
    name: 'VCF',
    state: 'complete',
    detail: 'VCF record ingestion and format gatekeeping.',
  },
  {
    name: 'Variant',
    state: 'complete',
    detail: 'Allele extraction and normalization to variant schema.',
  },
  {
    name: 'Gene',
    state: 'complete',
    detail: 'Variant-to-gene mapping using deterministic lookup tables.',
  },
  {
    name: 'Phenotype',
    state: 'active',
    detail: 'Diplotype-to-phenotype translation for enzyme activity class.',
  },
  {
    name: 'Risk',
    state: 'pending',
    detail: 'Drug-specific risk verdict and actionability assignment.',
  },
] as const;
