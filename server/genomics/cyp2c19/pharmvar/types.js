/**
 * PharmVar Database Loader & Indexer — Types & Schemas (Phase 2B.2)
 * Normalized data models for PharmVar TSV alleles, variant records,
 * version provenance, and validation status.
 *
 * STRICT BOUNDARIES: No clinical interpretation, diplotype assignment,
 * or drug-gene recommendations. Data engineering scaffolding only.
 */

/**
 * @typedef {Object} PharmVarRawRecord
 * @property {string} haplotypeName - Haplotype identifier (e.g. "CYP2C19*2.001" or "CYP2C19*1")
 * @property {string} gene - Gene symbol (e.g. "CYP2C19")
 * @property {string} rsid - dbSNP rsID (optional, e.g. "rs4244285" or "" or ".")
 * @property {string} referenceSequence - Reference sequence accession (e.g. "NC_000010.10")
 * @property {string} variantStart - Start coordinate relative to reference sequence
 * @property {string} variantStop - End coordinate relative to reference sequence
 * @property {string} referenceAllele - Reference allele (e.g. "A" or "REFERENCE")
 * @property {string} variantAllele - Variant/alternate allele (e.g. "G" or ".")
 * @property {string} variantType - Variant type (e.g. "substitution", "insertion", "deletion", "")
 * @property {number} sourceRowNumber - 1-based line number in source TSV
 */

/**
 * @typedef {Object} NormalizedVariant
 * @property {string} rsid - Normalized rsID or "." or "chrom:pos"
 * @property {string} referenceSequence - Reference sequence accession
 * @property {number} start - Numeric variant start coordinate
 * @property {number} end - Numeric variant end coordinate
 * @property {string} referenceAllele - Normalized reference allele
 * @property {string} variantAllele - Normalized variant allele
 * @property {string} variantType - Normalized variant type ("substitution", "insertion", "deletion", "reference")
 * @property {boolean} isReference - True if this represents a reference marker (REFERENCE / .)
 */

/**
 * @typedef {Object} NormalizedHaplotype
 * @property {string} haplotypeId - Full haplotype identifier (e.g. "CYP2C19*2.001")
 * @property {string} coreAllele - Core star allele name (e.g. "CYP2C19*2")
 * @property {string} subAllele - Suballele identifier (e.g. ".001" or null)
 * @property {string} gene - Gene symbol (e.g. "CYP2C19")
 * @property {string} referenceSequence - Reference sequence accession
 * @property {NormalizedVariant[]} variants - Array of defining variant records
 * @property {boolean} isReferenceHaplotype - True if reference (no defining variants)
 * @property {number} sourceRowNumber - First source row number
 */

/**
 * @typedef {Object} ValidationMessage
 * @property {'error' | 'warning'} severity - Severity level
 * @property {number} [rowNumber] - Source row number if applicable
 * @property {string} message - Human-readable description
 * @property {string} [code] - Machine-readable error code
 */

/**
 * @typedef {Object} DatasetProvenance
 * @property {string} datasetType - 'OFFICIAL_LOCAL_V6_2_21' | 'SYNTHETIC_FIXTURE' | 'LEGACY_COMPATIBILITY'
 * @property {string} pharmvarVersion - e.g. "6.2.21" (Note: v6.2.29 is NOT IMPORTED due to download block)
 * @property {boolean} v6_2_29Imported - false
 * @property {string} sourceFileChecksum - SHA-256 checksum of source file
 * @property {string} importedAtIso - ISO timestamp of import
 * @property {number} totalRecordsParsed - Total raw rows processed
 * @property {number} validHaplotypesCount - Number of valid normalized haplotypes indexed
 * @property {ValidationMessage[]} validationMessages - Warnings and errors encountered
 */
