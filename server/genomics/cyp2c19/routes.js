/**
 * CYP2C19 Genomic Infrastructure — API Routes (Phase 2B.1 Hardened)
 * Controlled API upload and processing interface for VCF parsing,
 * sample selection, GT/PS extraction, and callability reporting.
 *
 * STRICT BOUNDARIES: No clinical interpretation, diplotype assignment,
 * or drug-gene recommendations. Technical scaffolding only.
 */

import express from 'express';
import { parseVcfContent } from './parser.js';
import { CYP2C19_MVP_MARKERS } from './types.js';

const router = express.Router();

/**
 * Helper to check if role is allowed (matching server/index.js convention).
 */
function roleAllowed(role, allowedRoles) {
  if (role === 'demo' || role === 'admin') {
    return true;
  }
  return allowedRoles.includes(role);
}

/**
 * POST /api/genomics/cyp2c19/parse
 * Parse VCF content (raw text or JSON payload), select sample, extract GT/PS, and return technical scaffolding.
 * Requires authentication and appropriate staff role (doctor, lab_technician, admin, demo).
 */
router.post('/parse', (req, res) => {
  const auth = req.authContext;
  if (!auth || !roleAllowed(auth.role, ['doctor', 'lab_technician', 'admin', 'demo'])) {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized access to genomic parsing pipeline. Requires doctor, lab_technician, admin, or demo role.',
      code: 'UNAUTHORIZED_GENOMIC_ACCESS'
    });
  }

  try {
    const { vcfContent, sampleId, rawText } = req.body || {};
    const contentToParse = vcfContent || rawText;

    if (!contentToParse || typeof contentToParse !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: "vcfContent" or "rawText" (string) must be provided in request body.',
        code: 'INVALID_REQUEST_BODY'
      });
    }

    const parseResult = parseVcfContent(contentToParse, sampleId);

    if (!parseResult.success) {
      return res.status(422).json({
        success: false,
        error: parseResult.error || 'Failed to parse VCF content.',
        code: 'VCF_PARSE_ERROR'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        metadata: parseResult.metadata,
        variantCount: parseResult.variants.length,
        mvpMarkersDefinition: CYP2C19_MVP_MARKERS,
        selectedSample: sampleId || (parseResult.metadata.sampleIds[0] || null),
        callability: parseResult.provenance.callability,
        uncertaintyFlags: parseResult.provenance.uncertaintyFlags,
        provenance: parseResult.provenance,
        sampleGenotypesSample: parseResult.selectedSampleGenotypes ? Object.keys(parseResult.selectedSampleGenotypes).slice(0, 10) : []
      }
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      success: false,
      error: `Internal server error during VCF parsing: ${errorMessage}`,
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

/**
 * GET /api/genomics/cyp2c19/markers
 * Return MVP CYP2C19 markers supported by infrastructure scaffolding.
 */
router.get('/markers', (req, res) => {
  const auth = req.authContext;
  if (!auth || !roleAllowed(auth.role, ['doctor', 'lab_technician', 'admin', 'demo'])) {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized access to genomic markers metadata.',
      code: 'UNAUTHORIZED_GENOMIC_ACCESS'
    });
  }

  return res.status(200).json({
    success: true,
    gene: 'CYP2C19',
    pharmvarVersion: '6.2.21 (local repository scaffolding)',
    mvpMarkers: CYP2C19_MVP_MARKERS
  });
});

export default router;
