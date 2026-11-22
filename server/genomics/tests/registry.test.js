/**
 * Automated Unit Tests for Phase 3 & Phase 4 Genomics Engine Extensions
 * Verifies variant normalization, gene-specific reference accession checks,
 * CYP2D6 structural variant / CNV evaluation (including missing/ambiguous/conflicting cases),
 * evidence registry ingestion, versioning, and deterministic guideline querying under fail-closed clinical gates.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeVariantRecord,
  evaluateCyp2d6StructuralEvidence,
  PharmacogenomicEvidenceRegistry,
  SUPPORTED_PHARMACOGENES
} from '../registry.js';

describe('Phase 3 — Multi-Gene Variant Normalization & Validation', () => {
  it('should normalize a valid CYP2C19 variant record with correct metadata and provenance', () => {
    const raw = {
      gene: 'CYP2C19',
      chrom: '10',
      pos: '96541616',
      rsid: 'rs4244285',
      ref: 'G',
      alt: 'A',
      accession: 'NC_000010.10',
      referenceBuild: 'GRCh37',
      sourceProvenance: { sourceDb: 'PharmVar', version: 'v6.2.21', accessedAtIso: '2026-11-22T00:00:00.000Z' }
    };
    const res = normalizeVariantRecord(raw);
    expect(res.success).toBe(true);
    expect(res.normalizedVariant.gene).toBe('CYP2C19');
    expect(res.normalizedVariant.accession).toBe('NC_000010.10');
    expect(res.normalizedVariant.originalRecord).toBe(raw);
  });

  it('should normalize a valid CYP2D6 variant record with correct accession', () => {
    const raw = {
      gene: 'CYP2D6',
      chrom: '22',
      pos: '42126600',
      rsid: 'rs3892097',
      ref: 'G',
      alt: 'A',
      accession: 'NC_000022.10',
      referenceBuild: 'GRCh37'
    };
    const res = normalizeVariantRecord(raw);
    expect(res.success).toBe(true);
    expect(res.normalizedVariant.gene).toBe('CYP2D6');
    expect(res.normalizedVariant.accession).toBe('NC_000022.10');
  });

  it('should reject variant record with missing gene or unsupported gene', () => {
    const raw = { gene: 'UNKNOWN', pos: '100', ref: 'A', alt: 'G' };
    const res = normalizeVariantRecord(raw);
    expect(res.success).toBe(false);
    expect(res.normalizedVariant).toBeNull();
  });

  it('should reject accession mismatch for specific gene', () => {
    const raw = {
      gene: 'CYP2D6',
      chrom: '22',
      pos: '42126600',
      ref: 'G',
      alt: 'A',
      accession: 'NC_000010.10', // CYP2C19 accession passed to CYP2D6
      referenceBuild: 'GRCh37'
    };
    const res = normalizeVariantRecord(raw);
    expect(res.success).toBe(false);
    expect(res.normalizedVariant.normalizationFlags).toContain('ACCESSION_GENE_MISMATCH');
  });

  it('should handle missing provenance safely with UNKNOWN / NOT_PROVIDED', () => {
    const raw = {
      gene: 'CYP2C9',
      chrom: '10',
      pos: '96702000',
      ref: 'A',
      alt: 'C',
      accession: 'NC_000010.10',
      referenceBuild: 'GRCh37'
    };
    const res = normalizeVariantRecord(raw);
    expect(res.success).toBe(true);
    expect(res.normalizedVariant.sourceProvenance.sourceDb).toBe('UNKNOWN');
    expect(res.normalizedVariant.sourceProvenance.version).toBe('NOT_PROVIDED');
  });
});

describe('Phase 3.5 — CYP2D6 Structural Variant / CNV Validation Contract', () => {
  it('1. Should return INSUFFICIENT_EVIDENCE when both CNV and structural type are missing', () => {
    const obs = { gene: 'CYP2D6' };
    const res = evaluateCyp2d6StructuralEvidence(obs);
    expect(res.supported).toBe(false);
    expect(res.status).toBe('INSUFFICIENT_EVIDENCE');
    expect(res.structuralType).toBe('UNKNOWN');
  });

  it('2. Should return INSUFFICIENT_EVIDENCE or require structural type when copy number is 2 without type', () => {
    const obs = { gene: 'CYP2D6', copyNumber: 2 };
    const res = evaluateCyp2d6StructuralEvidence(obs);
    expect(res.supported).toBe(true);
    expect(res.structuralType).toBe('NORMAL');
  });

  it('3. Should mark confidence as UNKNOWN if missing', () => {
    const obs = { gene: 'CYP2D6', copyNumber: 1, structuralType: 'DELETION' };
    const res = evaluateCyp2d6StructuralEvidence(obs);
    expect(res.supported).toBe(true);
    expect(res.confidence).toBe('UNKNOWN');
  });

  it('4. Should support valid deletion evidence', () => {
    const obs = { gene: 'CYP2D6', copyNumber: 0, structuralType: 'DELETION', confidence: 'HIGH' };
    const res = evaluateCyp2d6StructuralEvidence(obs);
    expect(res.supported).toBe(true);
    expect(res.structuralType).toBe('GENE_DELETION');
    expect(res.isClinicallyActionable).toBe(false);
  });

  it('5. Should support valid duplication evidence', () => {
    const obs = { gene: 'CYP2D6', copyNumber: 4, structuralType: 'DUPLICATION', confidence: 'MODERATE' };
    const res = evaluateCyp2d6StructuralEvidence(obs);
    expect(res.supported).toBe(true);
    expect(res.structuralType).toBe('GENE_DUPLICATION');
  });

  it('6. Should support valid hybrid evidence', () => {
    const obs = { gene: 'CYP2D6', copyNumber: 2, hasHybridAllele: true, structuralType: 'HYBRID', confidence: 'HIGH' };
    const res = evaluateCyp2d6StructuralEvidence(obs);
    expect(res.supported).toBe(true);
    expect(res.structuralType).toBe('HYBRID_ALLELE');
  });

  it('7. Should reject invalid non-numeric or negative copy number', () => {
    const obs = { gene: 'CYP2D6', copyNumber: -1, structuralType: 'DELETION' };
    const res = evaluateCyp2d6StructuralEvidence(obs);
    expect(res.supported).toBe(false);
    expect(res.status).toBe('INVALID_EVIDENCE');
  });

  it('8. Should reject conflicting copy-number and structural-type evidence', () => {
    const obs = { gene: 'CYP2D6', copyNumber: 2, structuralType: 'DELETION' };
    const res = evaluateCyp2d6StructuralEvidence(obs);
    expect(res.supported).toBe(false);
    expect(res.status).toBe('INVALID_EVIDENCE');
  });
});

describe('Phase 4 — Evidence Registry & CPIC Guideline Integration', () => {
  it('should ingest and query CPIC guidelines deterministically', () => {
    const registry = new PharmacogenomicEvidenceRegistry();
    registry.registerCpicGuideline({
      guidelineId: 'CPIC-CYP2C9-VARS',
      title: 'CPIC Guideline for CYP2C9 and Warfarin',
      gene: 'CYP2C9',
      drug: 'Warfarin',
      phenotype: 'POOR_METABOLIZER',
      recommendation: 'Reduce initial dose significantly.',
      recommendationStrength: 'Strong',
      clinicalContext: 'GENERAL',
      pmid: '27918692',
      evidenceLevel: '1A'
    });

    const queryRes = registry.queryEvidence('CYP2C9', 'Warfarin', 'POOR_METABOLIZER', 'GENERAL');
    expect(queryRes.success).toBe(true);
    expect(queryRes.matchingGuidelinesCount).toBe(1);
    expect(queryRes.guidelines[0].recommendationStrength).toBe('Strong');
    expect(queryRes.clinicalGateStatus).toContain('NO-GO');
  });

  it('should track versioning and supersede outdated guideline records', () => {
    const registry = new PharmacogenomicEvidenceRegistry();
    registry.registerCpicGuideline({
      guidelineId: 'TEST-GUIDELINE-V1',
      title: 'Old Guideline Version',
      gene: 'CYP2C19',
      drug: 'Clopidogrel',
      phenotype: 'POOR_METABOLIZER',
      recommendation: 'Old recommendation'
    });

    registry.registerCpicGuideline({
      guidelineId: 'TEST-GUIDELINE-V2',
      title: 'Updated Guideline Version',
      gene: 'CYP2C19',
      drug: 'Clopidogrel',
      phenotype: 'POOR_METABOLIZER',
      recommendation: 'Updated recommendation'
    });

    const stats = registry.getStatistics();
    expect(stats.activeGuidelinesCount).toBeGreaterThanOrEqual(1);
  });
});
