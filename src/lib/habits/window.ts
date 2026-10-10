import { DateTime, IANAZone } from "luxon";
import {
  CHECKIN_TIME_PATTERN,
  MAX_CATCHUP_WINDOWS,
  PERIOD_DATE_OFFSET_HOURS,
} from "./constants";

/**
 * WindowCalculator: jendela check-in, `period_date`, dan catch-up.
 * Semua perhitungan tanggal memakai luxon dengan zona IANA eksplisit.
 * Rujukan: desain §8.1, §9.3, §12.1.
 */

export interface CheckinWindow {
  windowStart: Date;
  windowEnd: Date;
  /** Tanggal lokal "YYYY-MM-DD" untuk label kalender (zona = zona saat jendela dibuat). */
  periodDate: string;
}

export interface WindowScheduleLike {
  timezone: string;
  checkinLocalTime: string;
  /** Akhir jendela berjalan (UTC). Bila kosong dihitung dari `from`. */
  nextCheckinAt?: Date | null;
  /**
   * `periodDate` jendela terakhir yang sudah dibuat (bila ada). Dipakai agar jendela berikutnya
   * tidak pernah memakai `periodDate` yang sama (lihat `nextWindowEnd`).
   */
  lastPeriodDate?: string | null;
}

export function isValidTimezone(timezone: string): boolean {
  return typeof timezone === "string" && timezone.length > 0 && IANAZone.isValidZone(timezone);
}

export function assertValidTimezone(timezone: string): void {
  if (!isValidTimezone(timezone)) {
    throw new Error(`Zona waktu IANA tidak valid: "${timezone}"`);
  }
}

export function parseLocalTime(localTime: string): { hour: number; minute: number } {
  if (typeof localTime !== "string" || !CHECKIN_TIME_PATTERN.test(localTime)) {
    throw new Error(`Jam check-in harus berformat HH:mm, diterima: "${String(localTime)}"`);
  }
  const [hour, minute] = localTime.split(":").map(Number);
  return { hour, minute };
}

function assertValidInstant(value: Date, label: string): void {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(`${label} bukan waktu yang valid`);
  }
}

/**
 * Kemunculan berikutnya `localTime` di zona `timezone` yang **tepat setelah** `t`.
 *
 * Perilaku DST:
 * - Jam lokal tidak ada (lompat maju): dipakai kejadian valid pertama sesudahnya, yaitu jam
 *   lokal digeser maju sebesar celah (02:30 yang hilang -> 03:30), sesuai penyelesaian luxon.
 * - Jam lokal ganda (mundur): hanya satu kejadian per hari lokal yang dipakai (kejadian pertama);
 *   kejadian kedua tidak pernah menghasilkan check-in tambahan.
 */
export function nextCheckinAfter(t: Date, timezone: string, localTime: string): Date {
  assertValidInstant(t, "t");
  assertValidTimezone(timezone);
  const { hour, minute } = parseLocalTime(localTime);

  const startOfDay = DateTime.fromJSDate(t, { zone: timezone }).startOf("day");
  for (let offset = 0; offset <= 2; offset++) {
    const day = startOfDay.plus({ days: offset });
    const candidate = DateTime.fromObject(
      { year: day.year, month: day.month, day: day.day, hour, minute },
      { zone: timezone },
    );
    if (candidate.isValid && candidate.toMillis() > t.getTime()) {
      return candidate.toJSDate();
    }
  }
  throw new Error("Tidak dapat menentukan check-in berikutnya");
}

/** Tanggal lokal (YYYY-MM-DD) dari (windowEnd - 12 jam) di zona `timezone`. */
export function periodDate(windowEnd: Date, timezone: string): string {
  assertValidInstant(windowEnd, "windowEnd");
  assertValidTimezone(timezone);
  const iso = DateTime.fromJSDate(windowEnd, { zone: timezone })
    .minus({ hours: PERIOD_DATE_OFFSET_HOURS })
    .toISODate();
  if (!iso) throw new Error("Tidak dapat menghitung period_date");
  return iso;
}

/**
 * Akhir jendela berikutnya setelah `after`, dijamin **tidak** memakai `periodDate` yang sudah
 * dipakai jendela terakhir (`lastPeriodDate`).
 *
 * Aturan "perpanjang, jangan pendekkan sampai bertabrakan": bila kandidat dari
 * `nextCheckinAfter` punya `periodDate` <= `lastPeriodDate` (mis. jam diganti 20:00 -> 06:00
 * sehingga dua jendela berurutan sama-sama berlabel 9 Okt), kandidat dimajukan ke kemunculan
 * jam yang sama pada hari berikutnya. Jendela transisi menjadi lebih panjang (sekitar 34-48 jam)
 * tetapi tidak pernah bertabrakan, bolong, atau tumpang tindih. Event tetap presisi karena
 * dimasukkan ke jendela berdasarkan `occurredAt`.
 *
 * Gunakan fungsi ini saat membuat jendela berikutnya DAN saat menghitung ulang `nextCheckinAt`
 * setelah jam check-in/zona waktu diganti.
 */
export function nextWindowEnd(
  after: Date,
  timezone: string,
  localTime: string,
  lastPeriodDate?: string | null,
): Date {
  let candidate = nextCheckinAfter(after, timezone, localTime);
  if (!lastPeriodDate) return candidate;
  // Batas pengaman: paling banyak beberapa lompatan hari (praktis 1).
  for (let guard = 0; guard < 4; guard++) {
    if (periodDate(candidate, timezone) > lastPeriodDate) return candidate;
    candidate = nextCheckinAfter(candidate, timezone, localTime);
  }
  throw new Error("Tidak dapat menemukan check-in berikutnya tanpa tabrakan period_date");
}

/**
 * Membangun jendela catch-up berurutan (terlama dulu) yang berakhir pada atau sebelum `to`,
 * dimulai dari `from` (= `currentWindowStart`). Maksimum `max` jendela (bawaan 14); sisanya
 * diproses pada tick berikutnya dengan `from` = akhir jendela terakhir.
 */
export function buildWindows(
  habit: WindowScheduleLike,
  from: Date,
  to: Date,
  max: number = MAX_CATCHUP_WINDOWS,
): CheckinWindow[] {
  assertValidInstant(from, "from");
  assertValidInstant(to, "to");
  assertValidTimezone(habit.timezone);
  parseLocalTime(habit.checkinLocalTime);
  if (!Number.isInteger(max) || max < 0) throw new Error("max harus bilangan bulat >= 0");

  const windows: CheckinWindow[] = [];
  let windowStart = from;
  let lastPeriod = habit.lastPeriodDate ?? null;
  let windowEnd: Date;
  if (habit.nextCheckinAt && habit.nextCheckinAt.getTime() > from.getTime()) {
    windowEnd = habit.nextCheckinAt;
    if (lastPeriod && periodDate(windowEnd, habit.timezone) <= lastPeriod) {
      // Pengaman: nextCheckinAt tersimpan bertabrakan dengan jendela terakhir.
      windowEnd = nextWindowEnd(windowEnd, habit.timezone, habit.checkinLocalTime, lastPeriod);
    }
  } else {
    windowEnd = nextWindowEnd(from, habit.timezone, habit.checkinLocalTime, lastPeriod);
  }

  while (windows.length < max && windowEnd.getTime() <= to.getTime()) {
    const pd = periodDate(windowEnd, habit.timezone);
    windows.push({ windowStart, windowEnd, periodDate: pd });
    windowStart = windowEnd;
    lastPeriod = pd;
    windowEnd = nextWindowEnd(windowEnd, habit.timezone, habit.checkinLocalTime, lastPeriod);
  }
  return windows;
}
