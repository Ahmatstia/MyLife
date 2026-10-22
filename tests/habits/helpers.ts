import { buildWindows, type CheckinWindow } from "@/lib/habits/window";
import type { CheckinLike } from "@/lib/habits/streak";
import type { CheckinStatus, HabitEventLike } from "@/lib/habits/status";

export const d = (iso: string): Date => new Date(iso);

export const JAKARTA = "Asia/Jakarta";
export const MAKASSAR = "Asia/Makassar";
export const NEW_YORK = "America/New_York";

export const BREAK_ABSTAIN = { kind: "BREAK", mode: "ABSTAIN" } as const;

/** Awal jendela pertama: 10 Okt 2026 06:00 WIB. */
export const FIRST_WINDOW_START = d("2026-10-09T23:00:00Z");

/** Buat check-in harian 06:00 WIB berurutan dengan status yang diberikan (terlama dulu). */
export function dailyCheckins(statuses: readonly CheckinStatus[]): (CheckinLike & CheckinWindow)[] {
  const to = new Date(FIRST_WINDOW_START.getTime() + (statuses.length + 1) * 24 * 3600 * 1000);
  const windows = buildWindows(
    { timezone: JAKARTA, checkinLocalTime: "06:00" },
    FIRST_WINDOW_START,
    to,
    statuses.length,
  );
  if (windows.length !== statuses.length) throw new Error("helper: jumlah jendela tidak sesuai");
  return windows.map((w, i) => ({ ...w, status: statuses[i] }));
}

export function lapseAt(iso: string, extra: Partial<HabitEventLike> = {}): HabitEventLike {
  return { type: "LAPSE", occurredAt: d(iso), ...extra };
}
