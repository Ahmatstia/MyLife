/**
 * Konstanta inti Habits v2 (fungsi murni, tanpa I/O).
 * Rujukan: mylife-habits-feature-design.md §8, §9.3, §12.
 */

/** Masa tenggang menjawab check-in (jam). Desain §8.2. */
export const DEFAULT_GRACE_HOURS = 72;

/**
 * Batas LIVE vs BACKFILL (jam). Jawaban check-in dalam 12 jam setelah `windowEnd` berstatus LIVE,
 * lebih dari itu BACKFILL. Aturan sama untuk event: `loggedAt - occurredAt` > 12 jam -> BACKFILL.
 * Hanya penanda kualitas data; tidak memengaruhi hitungan streak. Bukan pengaturan pengguna.
 */
export const LIVE_RESPONSE_MAX_HOURS = 12;

/** Batas jendela catch-up per tick scheduler. Desain §9.3. */
export const MAX_CATCHUP_WINDOWS = 14;

/**
 * `period_date` = tanggal lokal dari (windowEnd - 12 jam). Desain §8.1.
 */
export const PERIOD_DATE_OFFSET_HOURS = 12;

/** Jumlah jendela terakhir yang dipakai menghitung clean rate. Desain §8.3. */
export const CLEAN_RATE_WINDOW_COUNT = 30;

/** Aturan kambuh bawaan: 3 jendela LAPSED dalam 7 hari. Desain §8.4. */
export const DEFAULT_RELAPSE_RULE = { count: 3, days: 7 } as const;

/** Format jam check-in lokal "HH:mm". */
export const CHECKIN_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const MS_PER_HOUR = 60 * 60 * 1000;
export const MS_PER_DAY = 24 * MS_PER_HOUR;
