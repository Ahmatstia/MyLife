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

export interface BuildProfileLike {
  scheduleType?: "DAILY" | "DAYS_OF_WEEK" | "TIMES_PER_WEEK";
  daysOfWeek?: number[];
  timesPerWeek?: number | null;
  restDays?: number[];
}

export interface HabitLike {
  kind: "BREAK" | "BUILD";
  mode?: "ABSTAIN" | "REDUCE" | null;
  buildProfile?: BuildProfileLike | null;
  timezone?: string;
}

export type BreakHabitLike = HabitLike;

export interface HabitComputedStats {
  currentStreakDays: number;
  longestStreakDays: number;
  confirmedCleanDays: number;
  /** Persen 0-100 (2 desimal), `null` bila belum ada jendela CLEAN/LAPSED. */
  cleanRate30d: number | null;
  /** Persen 0-100 (2 desimal) untuk Build: DONE / (DONE + MISSED) pada 30 hari terjadwal terakhir. */
  consistency30d: number | null;
  /** Streak tahan banting untuk Build: hanya putus bila 2 jendela terjadwal beruntun MISSED. */
  resilientStreak: number;
  lastLapseAt: Date | null;
  totalLapses: number;
  urgesResisted: number;
}

export class UnsupportedHabitError extends Error {
  readonly code = "NOT_SUPPORTED_YET";
  constructor() {
    super("Statistik hanya didukung untuk BREAK (ABSTAIN) dan BUILD.");
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

function computeBuildStats(
  checkins: readonly CheckinLike[],
  events: readonly HabitEventLike[],
  _habit: HabitLike,
  now: Date,
): HabitComputedStats {
  const nowMs = now.getTime();
  const active = activeEvents(events);
  const completionEvents = active.filter((e) => e.type === "COMPLETION");
  const skipEvents = active.filter((e) => e.type === "SKIP");
  const completionTimes = completionEvents.map((e) => e.occurredAt.getTime());
  const skipTimes = skipEvents.map((e) => e.occurredAt.getTime());

  // Jendela yang sudah berakhir, terurut kronologis (terlama ke terbaru).
  const ended = checkins
    .filter((c) => c.windowEnd.getTime() <= nowMs)
    .map((c) => {
      const start = c.windowStart.getTime();
      const end = c.windowEnd.getTime();
      let effective: CheckinStatus = c.status;
      if (completionTimes.some((t) => t >= start && t < end)) {
        effective = "DONE";
      } else if (skipTimes.some((t) => t >= start && t < end)) {
        effective = "SKIPPED";
      }
      return {
        windowStart: start,
        windowEnd: end,
        status: c.status,
        effective,
      };
    })
    .sort((a, b) => a.windowEnd - b.windowEnd);

  // Hanya jendela yang sudah terselesaikan (bukan PENDING).
  const counted = ended.filter((w) => w.effective !== "PENDING");

  // Jendela aktif terjadwal (DONE atau MISSED); SKIPPED adalah hari istirahat/skip netral.
  const scheduled = counted.filter(
    (w) => w.effective === "DONE" || w.effective === "MISSED",
  );

  // 1. consistency30d: 30 jendela terjadwal terbaru
  const recent30 = [...scheduled].reverse().slice(0, CLEAN_RATE_WINDOW_COUNT);
  const done30 = recent30.filter((w) => w.effective === "DONE").length;
  const consistency30d =
    recent30.length === 0
      ? null
      : Math.round((done30 * 10000) / recent30.length) / 100;

  // 2. resilientStreak: hanya putus bila 2 jendela terjadwal beruntun MISSED (T-15, T-16)
  let resilientStreak = 0;
  let consecutiveMisses = 0;
  for (const w of scheduled) {
    if (w.effective === "DONE") {
      resilientStreak++;
      consecutiveMisses = 0;
    } else if (w.effective === "MISSED") {
      consecutiveMisses++;
      if (consecutiveMisses >= 2) {
        resilientStreak = 0;
      }
    }
  }

  // 3. strict streak: berturut-turut DONE mundur dari jendela terjadwal terbaru
  let currentStreakDays = 0;
  for (let i = scheduled.length - 1; i >= 0; i--) {
    if (scheduled[i].effective === "DONE") {
      currentStreakDays++;
    } else if (scheduled[i].effective === "MISSED") {
      break;
    }
  }

  // 4. longest streak (strict consecutive DONE)
  let longestStreakDays = 0;
  let run = 0;
  for (const w of scheduled) {
    if (w.effective === "DONE") {
      run++;
      if (run > longestStreakDays) longestStreakDays = run;
    } else if (w.effective === "MISSED") {
      run = 0;
    }
  }

  const confirmedCleanDays = counted.filter((w) => w.effective === "DONE").length;

  return {
    currentStreakDays,
    longestStreakDays,
    confirmedCleanDays,
    cleanRate30d: consistency30d,
    consistency30d,
    resilientStreak,
    lastLapseAt: null,
    totalLapses: 0,
    urgesResisted: 0,
  };
}

export function computeStats(
  checkins: readonly CheckinLike[],
  events: readonly HabitEventLike[],
  habit: HabitLike,
  now: Date,
): HabitComputedStats {
  if (habit.kind === "BUILD") {
    return computeBuildStats(checkins, events, habit, now);
  }

  if (habit.kind !== "BREAK" || habit.mode !== "ABSTAIN") {
    throw new UnsupportedHabitError();
  }

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
    consistency30d: null,
    resilientStreak: 0,
    lastLapseAt,
    totalLapses: lapseEvents.length,
    urgesResisted,
  };
}
