export type HaltTag = "HUNGRY" | "ANGRY" | "LONELY" | "TIRED" | "BORED";

export interface HabitInsightTriggerInfo {
  id: string;
  name: string;
  category?: string;
}

export interface HabitEventInsightInput {
  id: string;
  kind: "URGE" | "LAPSE" | "CHECKIN" | "CUSTOM" | "ROUTINE_COMPLETED";
  occurredAt: Date;
  mood?: number | null;
  intensity?: number | null;
  durationMinutes?: number | null;
  haltState?: HaltTag[] | null;
  copingPlanId?: string | null;
  copingPlanTitle?: string | null;
  copingPlanSuccess?: boolean | null;
  triggers?: HabitInsightTriggerInfo[] | null;
}

export interface HabitCheckinInsightInput {
  id: string;
  periodDate: string | Date;
  mood?: number | null;
  quantity?: number | null;
  status: "CONFIRMED_CLEAN" | "CONFIRMED_OCCURRED" | "PENDING" | "EXPIRED";
}

export interface InsightEvidence {
  totalEvents: number;
  daysTracked: number;
  sampleSize: number;
  details?: Record<string, unknown>;
}

export type HabitInsightKind =
  | "RISK_WINDOWS"
  | "RISK_DAYS"
  | "TOP_TRIGGERS"
  | "HALT_SHARE"
  | "MOOD_CORRELATION"
  | "URGE_DURATION"
  | "PLAN_EFFECTIVENESS"
  | "EARLY_BURST_EDUCATION";

export interface HabitInsight {
  kind: HabitInsightKind;
  title: string;
  text: string;
  evidence: InsightEvidence;
  metadata?: Record<string, unknown>;
}

export interface RiskWindowBin {
  dayOfWeek: number; // 1=Senin .. 7=Minggu
  hour: number; // 0..23
  dayName: string;
  hourLabel: string;
  rawCount: number;
  weightedScore: number;
}

export interface InsightsResult {
  hasSufficientData: boolean;
  threshold: {
    requiredDays: number;
    actualDays: number;
    requiredEvents: number;
    actualEvents: number;
  };
  insights: HabitInsight[];
  heatmap: {
    // 7 baris (1..7: Senin..Minggu), masing-masing array 24 kolom (jam 0..23)
    grid: number[][];
    maxCount: number;
  };
}
