/**
 * PharmVar Database Indexer (Phase 2B.2 Final Data Integrity)
 * Builds high-performance searchable indexes preserving accession-specific haplotype identity.
 */

export class PharmVarIndexer {
  constructor() {
    /** @type {Map<string, import('./types.js').NormalizedHaplotype>} */
    this.haplotypeByUniqueKey = new Map(); // key: haplotypeId::referenceSequence
    /** @type {Map<string, import('./types.js').NormalizedHaplotype[]>} */
    this.haplotypesById = new Map(); // key: haplotypeId -> array across accessions
    /** @type {Map<string, import('./types.js').NormalizedHaplotype[]>} */
    this.haplotypesByGene = new Map();
    /** @type {Map<string, import('./types.js').NormalizedHaplotype[]>} */
    this.haplotypesByRsid = new Map();
    /** @type {Map<string, {haplotype: import('./types.js').NormalizedHaplotype, variant: import('./types.js').NormalizedVariant}[]>} */
    this.variantsByAccessionAndPos = new Map();
    /** @type {Map<string, {haplotype: import('./types.js').NormalizedHaplotype, variant: import('./types.js').NormalizedVariant}[]>} */
    this.variantsByExactMatch = new Map();
  }

  /**
   * Build indexes from an array of normalized haplotypes, preserving accession separation.
   * @param {import('./types.js').NormalizedHaplotype[]} haplotypes
   */
  buildIndexes(haplotypes) {
    this.clear();

    for (const hap of haplotypes) {
      // 1. Unique accession-specific key: haplotypeId + "::" + referenceSequence
      const uniqueKey = `${hap.haplotypeId}::${hap.referenceSequence}`;
      this.haplotypeByUniqueKey.set(uniqueKey, hap);

      // Group by haplotypeId for multi-accession lookup
      if (!this.haplotypesById.has(hap.haplotypeId)) {
        this.haplotypesById.set(hap.haplotypeId, []);
      }
      this.haplotypesById.get(hap.haplotypeId).push(hap);

      // 2. Gene symbol index
      const geneKey = hap.gene.toUpperCase();
      if (!this.haplotypesByGene.has(geneKey)) {
        this.haplotypesByGene.set(geneKey, []);
      }
      this.haplotypesByGene.get(geneKey).push(hap);

      // 3. Variant-level indexes
      for (const v of hap.variants) {
        if (v.rsid && v.rsid !== '.') {
          const rsidKey = v.rsid.toLowerCase();
          if (!this.haplotypesByRsid.has(rsidKey)) {
            this.haplotypesByRsid.set(rsidKey, []);
          }
          if (!this.haplotypesByRsid.get(rsidKey).includes(hap)) {
            this.haplotypesByRsid.get(rsidKey).push(hap);
          }
        }

        const posKey = `${v.referenceSequence}::${v.start}`;
        if (!this.variantsByAccessionAndPos.has(posKey)) {
          this.variantsByAccessionAndPos.set(posKey, []);
        }
        this.variantsByAccessionAndPos.get(posKey).push({ haplotype: hap, variant: v });

        const exactKey = `${v.referenceSequence}::${v.start}::${v.referenceAllele.toUpperCase()}::${v.variantAllele.toUpperCase()}`;
        if (!this.variantsByExactMatch.has(exactKey)) {
          this.variantsByExactMatch.set(exactKey, []);
        }
        this.variantsByExactMatch.get(exactKey).push({ haplotype: hap, variant: v });
      }
    }
  }

  clear() {
    this.haplotypeByUniqueKey.clear();
    this.haplotypesById.clear();
    this.haplotypesByGene.clear();
    this.haplotypesByRsid.clear();
    this.variantsByAccessionAndPos.clear();
    this.variantsByExactMatch.clear();
  }

  /**
   * Lookup haplotype by exact unique key (haplotypeId::accession).
   * @param {string} haplotypeId
   * @param {string} accession
   * @returns {import('./types.js').NormalizedHaplotype|undefined}
   */
  getByHaplotypeIdAndAccession(haplotypeId, accession) {
    return this.haplotypeByUniqueKey.get(`${haplotypeId}::${accession}`);
  }

  /**
   * Get all haplotype entries across accessions for a given haplotype ID.
   * @param {string} haplotypeId
   * @returns {import('./types.js').NormalizedHaplotype[]}
   */
  getAllByHaplotypeId(haplotypeId) {
    return this.haplotypesById.get(haplotypeId) || [];
  }

  /**
   * Legacy simple lookup (returns first matching haplotype for ID).
   * @param {string} haplotypeId
   * @returns {import('./types.js').NormalizedHaplotype|undefined}
   */
  getHaplotype(haplotypeId) {
    const list = this.getAllByHaplotypeId(haplotypeId);
    return list[0];
  }

  getByGene(gene) {
    return this.haplotypesByGene.get(gene.toUpperCase()) || [];
  }

  getByRsid(rsid) {
    return this.haplotypesByRsid.get(rsid.toLowerCase()) || [];
  }

  getByPosition(accession, position) {
    const key = `${accession}::${position}`;
    return this.variantsByAccessionAndPos.get(key) || [];
  }

  getByExactMatch(accession, position, ref, alt) {
    const key = `${accession}::${position}::${ref.toUpperCase()}::${alt.toUpperCase()}`;
    return this.variantsByExactMatch.get(key) || [];
  }

  getStatistics() {
    return {
      totalUniqueHaplotypeAccessions: this.haplotypeByUniqueKey.size,
      totalUniqueHaplotypeIds: this.haplotypesById.size,
      totalGenesIndexed: this.haplotypesByGene.size,
      totalRsidsIndexed: this.haplotypesByRsid.size,
      totalGenomicPositionsIndexed: this.variantsByAccessionAndPos.size
    };
  }
}
