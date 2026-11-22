/**
 * Ollama Local LLM Explanation Adapter for Pharmakon
 * Provides source-grounded explanation generation using local Ollama (qwen3:8b),
 * strictly adhering to clinical safety rules (AI explains, clinical rules decide).
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3.5:4b';
const OLLAMA_ENABLED = process.env.OLLAMA_ENABLED !== 'false';
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS) || 60000;

/**
 * Check if Ollama service and model are available.
 */
export async function checkOllamaAvailability() {
  if (!OLLAMA_ENABLED) {
    return { available: false, reason: 'Ollama is disabled via configuration.' };
  }
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) {
      return { available: false, reason: `Ollama returned status ${res.status}` };
    }
    const data = await res.json();
    const models = data.models || [];
    const modelFound = models.some(m => m.name.includes(OLLAMA_MODEL) || OLLAMA_MODEL.includes(m.name));
    if (!modelFound && models.length > 0) {
      return { available: true, model: models[0].name, warning: `Configured model ${OLLAMA_MODEL} not found, using ${models[0].name}` };
    }
    return { available: true, model: OLLAMA_MODEL };
  } catch (err) {
    return { available: false, reason: err.message };
  }
}

/**
 * Generate a structured, source-grounded explanation from validated genomic and clinical evidence.
 * @param {Object} payload - Structured evidence payload
 * @returns {Promise<Object>} Structured explanation response
 */
export async function generateGenomicExplanation(payload) {
  const availability = await checkOllamaAvailability();
  if (!availability.available) {
    return {
      success: false,
      fallback: true,
      reason: availability.reason || 'Ollama service unavailable.',
      explanation: {
        summary: 'Local LLM explanation currently unavailable (Ollama offline or disabled).',
        mechanism: payload.mechanism || 'Deterministic research evidence matching complete.',
        supportingEvidence: payload.sourceReferences || [],
        sourceReferences: payload.sourceReferences || [],
        uncertainties: payload.uncertainties || ['Service offline; deterministic rules apply.'],
        limitations: ['Clinical PGx recommendations remain disabled.'],
        disclaimer: 'CLINICAL PGX RECOMMENDATION DISABLED — RESEARCH AND DEMO ONLY.'
      }
    };
  }

  const modelToUse = availability.model || OLLAMA_MODEL;

  const systemPrompt = `You are a clinical pharmacogenomics assistant in the Pharmakon ERP system.
CRITICAL RULES:
1. Clinical rules decide; AI only explains.
2. Never invent phenotypes, diplotypes, risk scores, recommendations, or source publications.
3. Only explain the provided structured data.
4. If evidence is insufficient, state so clearly.
5. Return valid JSON matching the requested structure.`;

  const userPrompt = `Explain the following pharmacogenomic research findings in clear, professional clinical language:
Gene: ${payload.gene || 'Unknown'}
Drug: ${payload.drug || 'Unknown'}
Variants: ${JSON.stringify(payload.variants || [])}
Phenotype: ${payload.phenotype || 'Unresolved / Research Only'}
Evidence Summary: ${JSON.stringify(payload.evidenceSummary || {})}
Source References: ${JSON.stringify(payload.sourceReferences || [])}
Uncertainties: ${JSON.stringify(payload.uncertainties || [])}

Respond with a JSON object containing:
- summary (string)
- explanation (string)
- mechanism (string)
- supportingEvidence (array of strings)
- sourceReferences (array of strings)
- uncertainties (array of strings)
- limitations (array of strings)
- disclaimer (string)`;

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelToUse,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false,
        options: { temperature: 0.1, num_predict: 800 }
      }),
      signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS)
    });

    if (!res.ok) {
      throw new Error(`Ollama API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const rawContent = data.message?.content || '';

    let parsed = null;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Fallback
    }

    if (!parsed) {
      parsed = {
        summary: rawContent.slice(0, 300) || 'Synthesized genomic research findings.',
        explanation: rawContent || 'Deterministic matching evaluation completed successfully.',
        mechanism: payload.mechanism || 'Synthesized from validated research findings.',
        supportingEvidence: payload.sourceReferences || [],
        sourceReferences: payload.sourceReferences || [],
        uncertainties: payload.uncertainties || [],
        limitations: ['Generated via local Ollama LLM; research use only.'],
        disclaimer: 'CLINICAL PGX RECOMMENDATION DISABLED — RESEARCH AND DEMO ONLY.'
      };
    }

    return {
      success: true,
      fallback: false,
      modelUsed: modelToUse,
      explanation: parsed
    };
  } catch (err) {
    return {
      success: false,
      fallback: true,
      reason: err.message,
      explanation: {
        summary: 'Explanation generation timed out or failed.',
        mechanism: 'Deterministic research findings available.',
        supportingEvidence: payload.sourceReferences || [],
        sourceReferences: payload.sourceReferences || [],
        uncertainties: [err.message],
        limitations: ['Fallback template active.'],
        disclaimer: 'CLINICAL PGX RECOMMENDATION DISABLED — RESEARCH AND DEMO ONLY.'
      }
    };
  }
}
