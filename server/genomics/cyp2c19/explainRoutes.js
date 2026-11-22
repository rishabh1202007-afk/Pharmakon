/**
 * CYP2C19 Genomic Infrastructure — Explanation & Matching API Routes
 * Integrates local Ollama explanation generation and deterministic matching.
 */

import express from 'express';
import { generateGenomicExplanation, checkOllamaAvailability } from '../ollamaAdapter.js';
import { CYP2C19_MVP_MARKERS } from './types.js';

const router = express.Router();

function roleAllowed(role, allowedRoles) {
  if (role === 'demo' || role === 'admin') {
    return true;
  }
  return allowedRoles.includes(role);
}

/**
 * POST /api/genomics/cyp2c19/explain
 * Generate local LLM source-grounded explanation for validated genomic findings.
 */
router.post('/explain', async (req, res) => {
  const auth = req.authContext;
  if (!auth || !roleAllowed(auth.role, ['doctor', 'lab_technician', 'admin', 'demo'])) {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized access to genomic explanation service.',
      code: 'UNAUTHORIZED_GENOMIC_ACCESS'
    });
  }

  try {
    const payload = req.body || {};
    const explanationResult = await generateGenomicExplanation({
      gene: payload.gene || 'CYP2C19',
      drug: payload.drug || 'Clopidogrel',
      variants: payload.variants || CYP2C19_MVP_MARKERS,
      phenotype: payload.phenotype || 'Intermediate Metabolizer (Research Placeholder)',
      evidenceSummary: payload.evidenceSummary || { status: 'SUPPORTED', technicalCoverage: 1.0 },
      sourceReferences: payload.sourceReferences || ['CPIC:CYP2C19-Clopidogrel-v1.2', 'PharmVar:CYP2C19-v6.2.21'],
      uncertainties: payload.uncertainties || ['Synthetic demonstration data; research only.']
    });

    return res.status(200).json({
      success: true,
      ...explanationResult
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: `Failed to generate explanation: ${err.message}`,
      code: 'EXPLANATION_ERROR'
    });
  }
});

/**
 * GET /api/genomics/cyp2c19/ollama-status
 * Check local Ollama service availability.
 */
router.get('/ollama-status', async (req, res) => {
  const status = await checkOllamaAvailability();
  return res.status(200).json({
    success: true,
    ...status
  });
});

export default router;
