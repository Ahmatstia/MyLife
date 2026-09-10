export const v1Intents = [
  "TODAY",
  "NEXT_ACTION",
  "GOAL_STATUS",
  "TASK_STATUS",
  "TASK_SEARCH",
  "PROGRESS",
  "ANALYTICS",
  "STREAK",
  "TIME_SPENT",
  "COMPLETION",
  "BOTTLENECK",
  "REVIEW",
  "REFLECTION",
  "GOAL_CREATE",
  "TASK_CREATE",
  "TASK_COMPLETE",
  "TASK_REOPEN",
  "SESSION_START",
  "SESSION_END",
  "FOCUS",
  "OVERDUE",
  "MOTIVATION",
  "HELP",
  "UNKNOWN",
] as const;

export const v2Intents = [
  "GOAL_DELETE",
  "GOAL_UPDATE",
  "GOAL_GET",
  "STAGE_CREATE",
  "STAGE_UPDATE",
  "STAGE_DELETE",
  "STAGE_REORDER",
  "STAGE_STATUS",
  "TASK_DELETE",
  "TASK_UPDATE",
  "TASK_BULK_DELETE",
  "TASK_BULK_COMPLETE",
  "TASK_REORDER",
  "MULTI_STEP",
] as const;

export const allIntents = [...v1Intents, ...v2Intents] as const;

// Keep `intents` pointing to v1Intents for exact V1 corpus compatibility test
export const intents = v1Intents;

export type V1Intent = (typeof v1Intents)[number];
export type Intent = (typeof allIntents)[number];
export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export type EntityType =
  | "GOAL"
  | "STAGE"
  | "TASK"
  | "DATE"
  | "TIME"
  | "DURATION"
  | "PRIORITY"
  | "STATUS"
  | "COUNT"
  | "DIRECTION"
  | "ORDINAL";

export type Entity = {
  value: string;
  type: EntityType;
  start?: number;
  end?: number;
  confidence?: number;
  normalized?: string;
  metadata?: Record<string, unknown>;
};

export type IntentResult = {
  intent: Intent;
  confidence: number;
  normalizedText: string;
  entities: Entity[];
  source: "rule" | "baseline" | "enhanced" | "future-llm" | "gemini-llm";
};
