/**
 * Automated Unit Tests for Ollama Local LLM Adapter
 */

import { describe, it, expect, vi } from 'vitest';
import { checkOllamaAvailability, generateGenomicExplanation } from '../ollamaAdapter.js';

describe('Ollama Adapter Tests', () => {
  it('checkOllamaAvailability returns availability status object', async () => {
    const status = await checkOllamaAvailability();
    expect(status).toBeDefined();
    expect(typeof status.available).toBe('boolean');
  });

  it('generateGenomicExplanation gracefully handles offline or fallback mode', async () => {
    const payload = {
      gene: 'CYP2C19',
      drug: 'Clopidogrel',
      variants: [{ rsid: 'rs4244285', position: '96541616' }],
      phenotype: 'Intermediate Metabolizer (Synthetic Research)',
      sourceReferences: ['CPIC:CYP2C19-Clopidogrel-v1.2'],
      uncertainties: ['Synthetic test data']
    };
    const result = await generateGenomicExplanation(payload);
    expect(result).toBeDefined();
    expect(result.explanation).toBeDefined();
    expect(result.explanation.disclaimer).toContain('CLINICAL PGX RECOMMENDATION DISABLED');
  });
});
