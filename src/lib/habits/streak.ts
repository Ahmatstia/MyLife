import { CLEAN_RATE_WINDOW_COUNT } from "./constants";
import type { CheckinStatus, HabitEventLike } from "./status";

/**
 * StreakEngine: statistik diturunkan sepenuhnya dari check-in + event log (desain §8.3, §12.3).
 * Fungsi murni: urutan input tidak berpengaruh, hasil selalu bisa dihitung ulang dari nol.
 * Fase 1: hanya BREAK/ABSTAIN.
 */

export interface CheckinLike {
  windowStart: Date;
  windowEnd: Date;
  status: CheckinStatus;
}

export interface BreakHabitLike {
  kind: "BREAK" | "BUILD";
  mode: "ABSTAIN" | "REDUCE" | null;
}

export interface HabitComputedStats {
  currentStreakDays: number;
  longestStreakDays: number;
  confirmedCleanDays: number;
  /** Persen 0-100 (2 desimal), `null` bila belum ada jendela CLEAN/LAPSED. */
  cleanRate30d: number | null;
  lastLapseAt: Date | null;
  totalLapses: number;
  urgesResisted: number;
}

export class UnsupportedHabitError extends Error {
  readonly code = "NOT_SUPPORTED_YET";
  constructor() {
    super("Statistik hanya didukung untuk kebiasaan BREAK dengan mode ABSTAIN (Fase 1).");
    this.name = "UnsupportedHabitError";
  }
}

type Effective = "GOOD" | "LAPSED" | "NEUTRAL";

interface EndedWindow {
  windowEnd: number;
  status: CheckinStatus;
  effective: Effective;
}

const GOOD_STATUSES: ReadonlySet<CheckinStatus> = new Set<CheckinStatus>(["CLEAN", "UNCONFIRMED"]);

function activeEvents(events: readonly HabitEventLike[]): HabitEventLike[] {
  return events.filter((e) => e.deletedAt == null);
}

/**
 * Status efektif jendela. Event LAPSE aktif di dalam jendela selalu menang atas status
 * tersimpan (event log = sumber kebenaran), sehingga backfill/hapus event otomatis
 * tercermin tanpa menunggu baris check-in diperbarui.
 * PENDING dan status non-Break bersifat netral: tidak dihitung dan tidak memutus streak.
 */
function effectiveOf(checkin: CheckinLike, lapseTimes: readonly number[]): Effective {
  const start = checkin.windowStart.getTime();
  const end = checkin.windowEnd.getTime();
  if (lapseTimes.some((t) => t >= start && t < end)) return "LAPSED";
  if (checkin.status === "LAPSED") return "LAPSED";
  if (GOOD_STATUSES.has(checkin.status)) return "GOOD";
  return "NEUTRAL";
}

export function computeStats(
  checkins: readonly CheckinLike[],
  events: readonly HabitEventLike[],
  habit: BreakHabitLike,
  now: Date,
): HabitComputedStats {
  if (habit.kind !== "BREAK" || habit.mode !== "ABSTAIN") throw new UnsupportedHabitError();

  const nowMs = now.getTime();
  const active = activeEvents(events);
  const lapseEvents = active.filter((e) => e.type === "LAPSE");
  const lapseTimes = lapseEvents.map((e) => e.occurredAt.getTime());

  // Jendela yang sudah berakhir, terbaru dulu.
  const ended: EndedWindow[] = checkins
    .filter((c) => c.windowEnd.getTime() <= nowMs)
    .map((c) => ({
      windowEnd: c.windowEnd.getTime(),
      status: c.status,
      effective: effectiveOf(c, lapseTimes),
    }))
    .sort((a, b) => b.windowEnd - a.windowEnd);

  // Jendela yang dihitung = bukan PENDING/netral.
  const counted = ended.filter((w) => w.effective !== "NEUTRAL");

  let currentStreakDays = 0;
  const hasLapseAfterLastEndedWindow = lapseTimes.some(
    (t) => !ended[0] || t >= ended[0].windowEnd,
  );

  if (!hasLapseAfterLastEndedWindow) {
    for (const w of counted) {
      if (w.effective === "LAPSED") break;
      currentStreakDays++;
    }
  }

  let longestStreakDays = 0;
  let run = 0;
  for (let i = counted.length - 1; i >= 0; i--) {
    if (counted[i].effective === "GOOD") {
      run++;
      if (run > longestStreakDays) longestStreakDays = run;
    } else {
      run = 0;
    }
  }

  const confirmedCleanDays = counted.filter(
    (w) => w.effective === "GOOD" && w.status === "CLEAN",
  ).length;

  // 30 jendela terakhir yang sudah berakhir dan bukan PENDING; UNCONFIRMED tidak masuk penyebut.
  const recent = counted.slice(0, CLEAN_RATE_WINDOW_COUNT);
  const rated = recent.filter(
    (w) => w.effective === "LAPSED" || (w.effective === "GOOD" && w.status === "CLEAN"),
  );
  const cleanRate30d =
    rated.length === 0
      ? null
      : Math.round(
          (100 * rated.filter((w) => w.effective === "GOOD").length * 100) / rated.length,
        ) / 100;

  const lastLapseAt =
    lapseEvents.length === 0
      ? null
      : new Date(Math.max(...lapseEvents.map((e) => e.occurredAt.getTime())));

  const urgesResisted = active.filter(
    (e) => e.type === "URGE" && e.outcome === "RESISTED",
  ).length;

  return {
    currentStreakDays,
    longestStreakDays,
    confirmedCleanDays,
    cleanRate30d,
    lastLapseAt,
    totalLapses: lapseEvents.length,
    urgesResisted,
  };
}
