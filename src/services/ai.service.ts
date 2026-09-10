import { baselineClassifier } from "../ai/classifier";
import { enhancedClassifier } from "../ai/understanding/enhanced-classifier";
import { extractEntities } from "../ai/entities";
import { extractEntitiesV2 } from "../ai/understanding/entity-extractor";
import { normalizeText } from "../ai/normalization";
import type { AIInterpretation } from "../ai/types";
import { aiInterpretationSchema } from "../schemas/ai.schema";
import { classifyWithGemini, LLM_CONFIDENCE_THRESHOLD, getGeminiAvailability } from "../ai/llm/gemini-bridge";
import type { SafeAIContext } from "../ai/llm/gemini-bridge";

function confidenceLevel(confidence: number) {
  return confidence >= 0.8 ? "HIGH" : confidence >= 0.55 ? "MEDIUM" : "LOW";
}

/**
 * Tier 1 only — synchronous, deterministic.
 * Preserved exactly for backward compatibility and existing tests.
 */
export function interpretInput(input: string): AIInterpretation {
  const normalizedText = normalizeText(input);

  // Check multi-step connectors first
  if (
    normalizedText.includes(" lalu ") ||
    normalizedText.includes(" kemudian ") ||
    normalizedText.includes(" setelah itu ") ||
    normalizedText.includes(" dan setelahnya ")
  ) {
    const v2Entities = extractEntitiesV2(input);
    const interpretation = {
      input,
      normalizedText,
      intent: "MULTI_STEP" as const,
      confidence: 0.95,
      confidenceLevel: "HIGH" as const,
      entities: v2Entities,
      source: "baseline" as const,
    };
    return aiInterpretationSchema.parse(interpretation) as AIInterpretation;
  }

  // 1. Run baseline classifier first to maintain 100% V1 test compatibility
  const baselineResult = baselineClassifier.classify(input);

  let finalIntent = baselineResult.intent;
  let finalConfidence = baselineResult.confidence;
  let source: "baseline" | "rule" | "enhanced" | "future-llm" | "gemini-llm" = baselineResult.source;

  // 2. If baseline returned UNKNOWN or low confidence, evaluate enhanced classifier
  if (finalIntent === "UNKNOWN" || finalConfidence < 0.55) {
    const enhancedResult = enhancedClassifier.classify(input);
    if (enhancedResult.intent !== "UNKNOWN" && enhancedResult.confidence >= 0.55) {
      finalIntent = enhancedResult.intent;
      finalConfidence = enhancedResult.confidence;
      source = "enhanced";
    }
  }

  // Extract combined entities
  const baseEntities = extractEntities(normalizedText);
  const v2Entities = extractEntitiesV2(input);
  const entitiesMap = new Map<string, (typeof v2Entities)[number]>();
  for (const e of [...baseEntities, ...v2Entities]) {
    entitiesMap.set(`${e.type}:${e.value.toLowerCase()}`, e);
  }

  const interpretation = {
    input,
    normalizedText,
    intent: finalIntent,
    confidence: finalConfidence,
    confidenceLevel: confidenceLevel(finalConfidence),
    entities: Array.from(entitiesMap.values()),
    source,
  } as const;

  return aiInterpretationSchema.parse(interpretation) as AIInterpretation;
}

/**
 * Hybrid Tier 1 + Tier 2 — async.
 * Used by ai-command.service for production command handling.
 *
 * Flow:
 *  1. Tier 1 deterministic classifiers run first (fast, local)
 *  2. If confidence < LLM_CONFIDENCE_THRESHOLD AND Gemini is available → call Gemini
 *  3. If Gemini returns a higher-confidence result → use it
 *  4. On ANY Gemini failure → Tier 1 result is used as fallback
 */
export async function interpretInputHybrid(
  input: string,
  safeContext?: SafeAIContext
): Promise<AIInterpretation> {
  // Always run Tier 1 first
  const tier1 = interpretInput(input);

  // If Tier 1 is confident enough, skip Gemini entirely
  if (tier1.confidence >= LLM_CONFIDENCE_THRESHOLD) {
    return tier1;
  }

  // Only call Gemini if key is configured
  if (getGeminiAvailability() !== "available") {
    return tier1;
  }

  // Tier 2: call Gemini with sanitized context
  const llmResult = await classifyWithGemini(input, safeContext);
  if (!llmResult) {
    // Gemini failed → graceful fallback to Tier 1
    return tier1;
  }

  // Use Gemini result only if it's better
  if (llmResult.confidence <= tier1.confidence) {
    return tier1;
  }

  // Merge Gemini entities with existing Tier 1 entities (Gemini can supplement)
  const mergedEntities = [
    ...tier1.entities,
    ...llmResult.entities.filter(
      (llmEntity) =>
        !tier1.entities.some(
          (t1e) => t1e.type === llmEntity.type && t1e.value === llmEntity.value
        )
    ),
  ];

  const hybrid = {
    input,
    normalizedText: tier1.normalizedText,
    intent: llmResult.intent,
    confidence: llmResult.confidence,
    confidenceLevel: confidenceLevel(llmResult.confidence),
    entities: mergedEntities,
    source: "gemini-llm" as const,
  };

  return aiInterpretationSchema.parse(hybrid) as AIInterpretation;
}
