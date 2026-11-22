/**
 * CYP2C19 Genomic Infrastructure — Types & Schemas (Phase 2B.1 Hardened)
 * Technical data structures for VCF parsing, sample selection, genotypes,
 * phase-sets, callability, and evidence provenance.
 *
 * STRICT BOUNDARIES: No clinical interpretation, diplotype assignment,
 * or drug-gene recommendations. Technical scaffolding only.
 */

/**
 * @typedef {Object} VcfMetadata
 * @property {string} fileFormat - e.g. "VCFv4.1"
 * @property {string|null} referenceBuild - e.g. "GRCh37" / "hs37d5"
 * @property {string} fileDate - e.g. "20150218"
 * @property {string[]} sampleIds - List of all available sample IDs in the VCF
 * @property {number} totalVariants - Total variant records parsed
 */

/**
 * @typedef {Object} GenotypeCall
 * @property {string} sampleId - Sample identifier
 * @property {string} rawGt - Raw GT string from FORMAT/sample column (e.g. "0|1", "1/1", "./.")
 * @property {number[]} alleles - Parsed numeric alleles (e.g. [0, 1])
 * @property {boolean} isPhased - True if phased (|), false if unphased (/) or missing
 * @property {boolean} isMissing - True if missing (./. or .)
 * @property {string|null} phaseSet - PS field value if present (e.g. "1001")
 * @property {number|null} depth - Raw DP field if present (unvalidated technical metric)
 * @property {number|null} genotypeQuality - Raw GQ field if present (unvalidated technical metric)
 */

/**
 * @typedef {Object} VariantRecord
 * @property {string} chrom - Chromosome (e.g. "10" or "chr10")
 * @property {string} pos - 1-based chromosomal position
 * @property {string} rsid - Variant ID or "." or "chrom:pos"
 * @property {string} ref - Reference allele
 * @property {string} alt - Alternate allele(s) (comma-separated if multiallelic)
 * @property {string|null} qual - Quality score
 * @property {string} filter - Filter status ("PASS" or filter IDs)
 * @property {string} infoRaw - Raw INFO string
 * @property {Record<string, string>} infoMap - Parsed key-value pairs from INFO
 * @property {string[]} formatFields - FORMAT keys (e.g. ["GT", "DP", "PS"])
 * @property {Record<string, GenotypeCall>} genotypes - Sample ID -> GenotypeCall mapping
 */

/**
 * @typedef {Object} TechnicalCallabilityReport
 * @property {string[]} markersAnalyzed - List of MVP marker rsIDs
 * @property {string[]} markerRecordsAvailable - Markers whose genomic positions were found in VCF records
 * @property {string[]} sampleGenotypesPresent - Markers with non-missing genotype calls for selected sample
 * @property {Record<string, {depth: number|null, genotypeQuality: number|null}>} rawQualityMetrics - Unvalidated raw DP/GQ metrics
 * @property {string} technicalCallabilityStatus - "SUFFICIENT" | "PARTIAL" | "INSUFFICIENT" (Technical record presence only; clinical assay callability is unvalidated)
 * @property {boolean} assumesReference - FALSE (Absent records are NEVER assumed homozygous reference)
 */

/**
 * @typedef {Object} EvidenceProvenance
 * @property {string} pharmvarVersion - Loaded PharmVar data version (local v6.2.21)
 * @property {string} parserVersion - VCF parser engine version ("1.0.1-hardened")
 * @property {string} timestampIso - ISO timestamp of processing
 * @property {TechnicalCallabilityReport} callability - Technical callability metrics
 * @property {string[]} uncertaintyFlags - Technical uncertainty flags
 */

/**
 * @typedef {Object} VcfParseResult
 * @property {boolean} success - True if VCF successfully parsed
 * @property {string|null} error - Error message if failed
 * @property {VcfMetadata} metadata - Vcf metadata and sample list
 * @property {VariantRecord[]} variants - Filtered or all variant records
 * @property {Record<string, GenotypeCall>|null} selectedSampleGenotypes - Genotypes for selected sample ID
 * @property {EvidenceProvenance} provenance - Evidence tracking and callability
 */

/**
 * CYP2C19 MVP Marker Set (An MVP marker subset for testing parser scaffolding;
 * does NOT represent complete PharmVar star-allele coverage).
 */
export const CYP2C19_MVP_MARKERS = [
  { rsid: 'rs3758581', pos: '96602623', gene: 'CYP2C19', role: '*1 core / intronic (MVP)' },
  { rsid: 'rs4244285', pos: '96541616', gene: 'CYP2C19', role: '*2 core splice defect (MVP)' },
  { rsid: 'rs4986893', pos: '96540410', gene: 'CYP2C19', role: '*3 core nonsense (MVP)' },
  { rsid: 'rs12248560', pos: '96521657', gene: 'CYP2C19', role: '*17 core regulatory (MVP)' },
  { rsid: 'rs28399504', pos: '96522463', gene: 'CYP2C19', role: '*4 core start codon (MVP)' },
  { rsid: 'rs17884712', pos: '96535246', gene: 'CYP2C19', role: '*9 core decreased function (MVP)' }
];
