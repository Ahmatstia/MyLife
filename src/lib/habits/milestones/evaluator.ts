import { MILESTONE_DEFINITIONS, type MilestoneDef } from "./definitions";

export interface MilestoneEvaluationInput {
  currentStreakDays: number;
  longestStreakDays: number;
  urgesResisted: number;
  totalLapses: number;
  hasDebrief: boolean;
  existingCodes: Set<string>;
  now: Date;
}

export interface AchievedMilestone {
  code: string;
  title: string;
  achievedAt: Date;
}

const STREAK_THRESHOLDS = [1, 3, 7, 14, 30, 60, 90, 180, 365] as const;

export function evaluateMilestones(
  input: MilestoneEvaluationInput,
): AchievedMilestone[] {
  const {
    currentStreakDays,
    longestStreakDays,
    urgesResisted,
    totalLapses,
    hasDebrief,
    existingCodes,
    now,
  } = input;

  const maxStreak = Math.max(currentStreakDays, longestStreakDays);
  const newlyAchieved: AchievedMilestone[] = [];

  const defMap = new Map<string, MilestoneDef>(
    MILESTONE_DEFINITIONS.map((def) => [def.code, def]),
  );

  // 1. Evaluasi Streak
  for (const threshold of STREAK_THRESHOLDS) {
    const code = `STREAK_${threshold}`;
    if (maxStreak >= threshold && !existingCodes.has(code)) {
      const def = defMap.get(code);
      if (def) {
        newlyAchieved.push({
          code,
          title: def.title,
          achievedAt: now,
        });
      }
    }
  }

  // 2. Evaluasi Urge Resisted
  if (urgesResisted >= 1 && !existingCodes.has("FIRST_URGE_RESISTED")) {
    const def = defMap.get("FIRST_URGE_RESISTED");
    if (def) {
      newlyAchieved.push({
        code: "FIRST_URGE_RESISTED",
        title: def.title,
        achievedAt: now,
      });
    }
  }

  if (urgesResisted >= 10 && !existingCodes.has("URGES_RESISTED_10")) {
    const def = defMap.get("URGES_RESISTED_10");
    if (def) {
      newlyAchieved.push({
        code: "URGES_RESISTED_10",
        title: def.title,
        achievedAt: now,
      });
    }
  }

  // 3. Evaluasi Refleksi (Debrief)
  if (hasDebrief && !existingCodes.has("FIRST_DEBRIEF")) {
    const def = defMap.get("FIRST_DEBRIEF");
    if (def) {
      newlyAchieved.push({
        code: "FIRST_DEBRIEF",
        title: def.title,
        achievedAt: now,
      });
    }
  }

  // 4. Evaluasi Bangkit Setelah Terpeleset
  if (totalLapses >= 1 && currentStreakDays >= 1 && !existingCodes.has("RETURNED_AFTER_SLIP")) {
    const def = defMap.get("RETURNED_AFTER_SLIP");
    if (def) {
      newlyAchieved.push({
        code: "RETURNED_AFTER_SLIP",
        title: def.title,
        achievedAt: now,
      });
    }
  }

  return newlyAchieved;
}
