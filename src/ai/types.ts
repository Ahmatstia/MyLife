import type { ConfidenceLevel, Entity, Intent } from "./intents";

export type AIInterpretation = { input: string; normalizedText: string; intent: Intent; confidence: number; confidenceLevel: ConfidenceLevel; entities: Entity[]; source: "rule" | "baseline" | "enhanced" | "future-llm" | "gemini-llm" };
export interface IntentClassifier { classify(text: string): IntentResult; }
type IntentResult = import("./intents").IntentResult;
