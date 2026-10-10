import { DEFAULT_GRACE_HOURS, LIVE_RESPONSE_MAX_HOURS, MS_PER_HOUR } from "./constants";

/**
 * Penentuan status check-in. Fase 1 hanya mencakup BREAK/ABSTAIN (desain §8.2).
 * Status Reduce/Build ditambahkan di Fase 3.
 */

export type HabitEventType = "URGE" | "LAPSE" | "OCCURRENCE" | "COMPLETION" | "SKIP";

export type CheckinStatus =
  | "PENDING"
  | "CLEAN"
  | "LAPSED"
  | "WITHIN_LIMIT"
  | "OVER_LIMIT"
  | "DONE"
  | "SKIPPED"
  | "MISSED"
  | "UNCONFIRMED";

export interface HabitEventLike {
  type: HabitEventType;
  occurredAt: Date;
  /** Untuk URGE: RESISTED | GAVE_IN. */
  outcome?: "RESISTED" | "GAVE_IN" | null;
  /** Event yang di-soft-delete diabaikan. */
  deletedAt?: Date | null;
}

export type CheckinAnswer = "CLEAN" | "LAPSED";

export type RejectionCode =
  | "CLEAN_REJECTED_LAPSE_EXISTS"
  | "LAPSE_EVENT_REQUIRED"
  | "GRACE_PERIOD_PASSED";

export type ResolveResult =
  | { ok: true; status: CheckinStatus }
  | { ok: false; code: RejectionCode; status: CheckinStatus };

function isActive(event: HabitEventLike): boolean {
  return event.deletedAt == null;
}

/** Event aktif yang jatuh pada jendela `[windowStart, windowEnd)` berdasarkan `occurredAt`. */
export function eventsInWindow(
  events: readonly HabitEventLike[],
  windowStart: Date,
  windowEnd: Date,
): HabitEventLike[] {
  const start = windowStart.getTime();
  const end = windowEnd.getTime();
  return events.filter((e) => {
    if (!isActive(e)) return false;
    const at = e.occurredAt.getTime();
    return at >= start && at < end;
  });
}

export function hasLapse(events: readonly HabitEventLike[]): boolean {
  return events.some((e) => isActive(e) && e.type === "LAPSE");
}

/** Status awal saat jendela dibuat: LAPSED bila ada LAPSE, selain itu PENDING. */
export function initialStatus(windowEvents: readonly HabitEventLike[]): CheckinStatus {
  return hasLapse(windowEvents) ? "LAPSED" : "PENDING";
}

/** Masa tenggang sudah lewat bila `now >= windowEnd + graceHours`. */
export function isGracePassed(
  windowEnd: Date,
  now: Date,
  graceHours: number = DEFAULT_GRACE_HOURS,
): boolean {
  return now.getTime() >= windowEnd.getTime() + graceHours * MS_PER_HOUR;
}

/**
 * Apakah check-in boleh dijawab pada `now`: jendela harus sudah berakhir dan masih dalam
 * masa tenggang. Mengembalikan alasan penolakan, atau `null` bila boleh.
 */
export function respondRejection(
  windowEnd: Date,
  now: Date,
  graceHours: number = DEFAULT_GRACE_HOURS,
): "WINDOW_NOT_ENDED" | "GRACE_PERIOD_PASSED" | null {
  if (now.getTime() < windowEnd.getTime()) return "WINDOW_NOT_ENDED";
  if (isGracePassed(windowEnd, now, graceHours)) return "GRACE_PERIOD_PASSED";
  return null;
}

/**
 * Status check-in BREAK/ABSTAIN (desain §8.2):
 * - Ada LAPSE di jendela -> LAPSED. Jawaban "bersih" ditolak (invarian 4).
 * - Jawaban "LAPSED" tanpa event LAPSE ditolak: terpeleset harus tercatat sebagai event.
 * - Jawaban "CLEAN" tanpa LAPSE -> CLEAN, selama masa tenggang belum lewat.
 * - Jawaban setelah masa tenggang ditolak (status tetap UNCONFIRMED).
 * - Tanpa jawaban: PENDING; setelah masa tenggang -> UNCONFIRMED.
 */
export function resolveStatus(
  answer: CheckinAnswer | null | undefined,
  windowEvents: readonly HabitEventLike[],
  gracePassed: boolean,
): ResolveResult {
  if (hasLapse(windowEvents)) {
    if (answer === "CLEAN") {
      return { ok: false, code: "CLEAN_REJECTED_LAPSE_EXISTS", status: "LAPSED" };
    }
    return { ok: true, status: "LAPSED" };
  }

  if (answer === "LAPSED") {
    return { ok: false, code: "LAPSE_EVENT_REQUIRED", status: gracePassed ? "UNCONFIRMED" : "PENDING" };
  }

  if (answer === "CLEAN") {
    if (gracePassed) {
      return { ok: false, code: "GRACE_PERIOD_PASSED", status: "UNCONFIRMED" };
    }
    return { ok: true, status: "CLEAN" };
  }

  return { ok: true, status: gracePassed ? "UNCONFIRMED" : "PENDING" };
}

export type ResponseSource = "LIVE" | "BACKFILL";

/**
 * Menentukan apakah jawaban check-in berstatus LIVE atau BACKFILL.
 * Jawaban dalam 12 jam (LIVE_RESPONSE_MAX_HOURS) setelah windowEnd -> LIVE, lebih dari itu -> BACKFILL.
 */
export function determineResponseSource(
  windowEnd: Date,
  respondedAt: Date,
  maxLiveHours: number = LIVE_RESPONSE_MAX_HOURS,
): ResponseSource {
  const diffMs = respondedAt.getTime() - windowEnd.getTime();
  return diffMs <= maxLiveHours * MS_PER_HOUR ? "LIVE" : "BACKFILL";
}

export type EventSource = "APP" | "SOS" | "CHECKIN" | "BACKFILL";

/**
 * Menentukan source event berdasarkan jeda waktu pencatatan (loggedAt - occurredAt).
 * Bila jeda > 12 jam (LIVE_RESPONSE_MAX_HOURS) dan bukan sumber khusus, otomatis ditandai BACKFILL.
 */
export function determineEventSource(
  occurredAt: Date,
  loggedAt: Date,
  preferredSource: EventSource = "APP",
  maxLiveHours: number = LIVE_RESPONSE_MAX_HOURS,
): EventSource {
  if (preferredSource === "BACKFILL") return "BACKFILL";
  const diffMs = loggedAt.getTime() - occurredAt.getTime();
  if (diffMs > maxLiveHours * MS_PER_HOUR) {
    return "BACKFILL";
  }
  return preferredSource;
}

