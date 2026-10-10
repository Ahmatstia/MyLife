import type { HabitEventLike, CheckinStatus } from "./status";

/**
 * Pure functions untuk Mode REDUCE (desain §8.4, §8.5, §12.6).
 * Mengatur kuota harian yang turun bertahap dan evaluasi status WITHIN_LIMIT / OVER_LIMIT.
 */

export interface ReduceProfileLike {
  reduceDailyLimit?: number | null;
  baselinePerDay?: number | null;
  reduceStepPercent?: number | null;
  reduceStepEveryDays?: number | null;
}

/**
 * Menghitung batas harian untuk mode Reduce pada hari ke-N sejak kebiasaan dimulai (§12.6).
 *
 * Rumus:
 *   steps = floor(daysSinceStart / reduceStepEveryDays)
 *   factor = (1 - reduceStepPercent / 100) ^ steps
 *   limit = round(initialLimit * factor)
 *
 * Menjamin hasil selalu integer >= 0 (tidak pernah di bawah 0).
 */
export function dailyLimit(
  profile: ReduceProfileLike,
  daysSinceStart: number,
): number {
  const initialLimit =
    profile.reduceDailyLimit ??
    (profile.baselinePerDay ? Math.round(Number(profile.baselinePerDay)) : 0);

  const stepEveryDays = profile.reduceStepEveryDays ?? 0;
  const stepPercent = profile.reduceStepPercent ?? 0;

  if (stepEveryDays <= 0 || stepPercent <= 0 || daysSinceStart <= 0) {
    return Math.max(0, initialLimit);
  }

  const steps = Math.floor(Math.max(0, daysSinceStart) / stepEveryDays);
  const factor = Math.pow(Math.max(0, 1 - stepPercent / 100), steps);
  const calculated = Math.round(initialLimit * factor);

  return Math.max(0, calculated);
}

export interface OccurrenceEventLike extends HabitEventLike {
  quantity?: number | { toNumber?: () => number } | null;
}

/**
 * Menghitung total kuantitas dari semua event OCCURRENCE aktif di dalam daftar.
 */
export function sumOccurrences(events: readonly OccurrenceEventLike[]): number {
  return events
    .filter((e) => e.deletedAt == null && e.type === "OCCURRENCE")
    .reduce((total, e) => {
      let qty = 1;
      if (typeof e.quantity === "number") {
        qty = e.quantity;
      } else if (e.quantity && typeof e.quantity.toNumber === "function") {
        qty = e.quantity.toNumber();
      }
      return total + (qty > 0 ? qty : 0);
    }, 0);
}

export type ReduceCheckinAnswer = "WITHIN_LIMIT" | "OVER_LIMIT";

/**
 * Evaluasi status jendela check-in untuk kebiasaan ber-mode REDUCE (§8.4).
 * - Total kejadian > batas hari itu -> OVER_LIMIT (BUKAN LAPSE).
 * - Total kejadian <= batas hari itu:
 *     - Bila dijawab WITHIN_LIMIT atau masa tenggang terlewati -> WITHIN_LIMIT.
 *     - Sebelum masa tenggang dan belum dijawab -> PENDING.
 */
export function resolveReduceStatus(
  answer: ReduceCheckinAnswer | null | undefined,
  windowEvents: readonly OccurrenceEventLike[],
  limit: number,
  gracePassed: boolean = false,
): { ok: true; status: CheckinStatus; totalQuantity: number } {
  const total = sumOccurrences(windowEvents);

  if (total > limit || answer === "OVER_LIMIT") {
    return { ok: true, status: "OVER_LIMIT", totalQuantity: total };
  }

  if (answer === "WITHIN_LIMIT" || gracePassed) {
    return { ok: true, status: "WITHIN_LIMIT", totalQuantity: total };
  }

  return { ok: true, status: "PENDING", totalQuantity: total };
}
