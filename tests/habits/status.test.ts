import { describe, expect, it } from "vitest";
import {
  determineEventSource,
  determineResponseSource,
  eventsInWindow,
  hasLapse,
  initialStatus,
  isGracePassed,
  resolveStatus,
  respondRejection,
  type HabitEventLike,
} from "@/lib/habits/status";
import { DEFAULT_GRACE_HOURS, LIVE_RESPONSE_MAX_HOURS } from "@/lib/habits/constants";
import { d, lapseAt } from "./helpers";

// Jendela 12 Okt 06:00 WIB -> 13 Okt 06:00 WIB
const WINDOW_START = d("2026-10-11T23:00:00Z");
const WINDOW_END = d("2026-10-12T23:00:00Z");
const HOUR = 3600 * 1000;

describe("eventsInWindow", () => {
  const inside = lapseAt("2026-10-12T05:00:00Z");

  it("hanya event aktif dalam [start, end)", () => {
    const atStart = lapseAt("2026-10-11T23:00:00Z");
    const atEnd = lapseAt("2026-10-12T23:00:00Z");
    const before = lapseAt("2026-10-11T22:59:59Z");
    const deleted = lapseAt("2026-10-12T06:00:00Z", { deletedAt: d("2026-10-12T07:00:00Z") });
    const result = eventsInWindow([inside, atStart, atEnd, before, deleted], WINDOW_START, WINDOW_END);
    expect(result).toEqual([inside, atStart]);
  });
});

describe("initialStatus", () => {
  it("T-06: terpeleset 23:40 WIB pada jendela 06:00-06:00 -> LAPSED", () => {
    const events = eventsInWindow([lapseAt("2026-10-12T16:40:00Z")], WINDOW_START, WINDOW_END);
    expect(initialStatus(events)).toBe("LAPSED");
  });

  it("tanpa LAPSE -> PENDING (URGE tidak mengubah status)", () => {
    expect(initialStatus([])).toBe("PENDING");
    const urge: HabitEventLike = { type: "URGE", occurredAt: d("2026-10-12T05:00:00Z"), outcome: "RESISTED" };
    expect(initialStatus([urge])).toBe("PENDING");
  });

  it("T-09: backfill terpeleset pada jendela lampau -> LAPSED", () => {
    expect(initialStatus([lapseAt("2026-10-07T03:00:00Z")])).toBe("LAPSED");
  });

  it("T-10: LAPSE yang dihapus (soft delete) tidak dihitung -> kembali PENDING", () => {
    const deleted = lapseAt("2026-10-12T05:00:00Z", { deletedAt: d("2026-10-12T08:00:00Z") });
    expect(hasLapse([deleted])).toBe(false);
    expect(initialStatus([deleted])).toBe("PENDING");
  });
});

describe("masa tenggang", () => {
  it("default 72 jam", () => {
    expect(DEFAULT_GRACE_HOURS).toBe(72);
  });

  it("isGracePassed: tepat pada 72 jam dianggap sudah lewat", () => {
    const at = (h: number) => new Date(WINDOW_END.getTime() + h * HOUR);
    expect(isGracePassed(WINDOW_END, at(71.99))).toBe(false);
    expect(isGracePassed(WINDOW_END, at(72))).toBe(true);
    expect(isGracePassed(WINDOW_END, at(73))).toBe(true);
    expect(isGracePassed(WINDOW_END, at(24), 24)).toBe(true);
    expect(isGracePassed(WINDOW_END, at(23), 24)).toBe(false);
  });

  it("respondRejection: belum berakhir / lewat tenggang / boleh", () => {
    expect(respondRejection(WINDOW_END, new Date(WINDOW_END.getTime() - 1))).toBe("WINDOW_NOT_ENDED");
    expect(respondRejection(WINDOW_END, WINDOW_END)).toBeNull();
    expect(respondRejection(WINDOW_END, new Date(WINDOW_END.getTime() + 5 * HOUR))).toBeNull();
    expect(respondRejection(WINDOW_END, new Date(WINDOW_END.getTime() + 73 * HOUR))).toBe("GRACE_PERIOD_PASSED");
  });
});

describe("resolveStatus (desain §8.2, Break/Abstain)", () => {
  it("T-07: PENDING dijawab 'CLEAN' 5 jam kemudian -> CLEAN", () => {
    const now = new Date(WINDOW_END.getTime() + 5 * HOUR);
    expect(respondRejection(WINDOW_END, now)).toBeNull();
    expect(resolveStatus("CLEAN", [], isGracePassed(WINDOW_END, now))).toEqual({ ok: true, status: "CLEAN" });
  });

  it("T-08: dijawab setelah 73 jam -> ditolak, status UNCONFIRMED", () => {
    const now = new Date(WINDOW_END.getTime() + 73 * HOUR);
    const passed = isGracePassed(WINDOW_END, now);
    expect(passed).toBe(true);
    expect(resolveStatus("CLEAN", [], passed)).toEqual({
      ok: false,
      code: "GRACE_PERIOD_PASSED",
      status: "UNCONFIRMED",
    });
  });

  it("tanpa jawaban: PENDING dalam tenggang, UNCONFIRMED sesudahnya", () => {
    expect(resolveStatus(null, [], false)).toEqual({ ok: true, status: "PENDING" });
    expect(resolveStatus(undefined, [], true)).toEqual({ ok: true, status: "UNCONFIRMED" });
  });

  it("invarian: ada LAPSE di jendela -> jawaban 'bersih' ditolak, status tetap LAPSED", () => {
    const events = [lapseAt("2026-10-12T16:40:00Z")];
    expect(resolveStatus("CLEAN", events, false)).toEqual({
      ok: false,
      code: "CLEAN_REJECTED_LAPSE_EXISTS",
      status: "LAPSED",
    });
    expect(resolveStatus("CLEAN", events, true).ok).toBe(false);
  });

  it("ada LAPSE: tanpa jawaban atau jawaban LAPSED -> LAPSED (bahkan setelah tenggang)", () => {
    const events = [lapseAt("2026-10-12T16:40:00Z")];
    expect(resolveStatus(null, events, false)).toEqual({ ok: true, status: "LAPSED" });
    expect(resolveStatus(null, events, true)).toEqual({ ok: true, status: "LAPSED" });
    expect(resolveStatus("LAPSED", events, false)).toEqual({ ok: true, status: "LAPSED" });
  });

  it("jawaban 'LAPSED' tanpa event LAPSE ditolak (terpeleset harus tercatat sebagai event)", () => {
    expect(resolveStatus("LAPSED", [], false)).toEqual({
      ok: false,
      code: "LAPSE_EVENT_REQUIRED",
      status: "PENDING",
    });
    expect(resolveStatus("LAPSED", [], true)).toEqual({
      ok: false,
      code: "LAPSE_EVENT_REQUIRED",
      status: "UNCONFIRMED",
    });
  });

  it("T-10: LAPSE dihapus -> jawaban 'bersih' kembali diterima", () => {
    const deleted = lapseAt("2026-10-12T16:40:00Z", { deletedAt: d("2026-10-13T00:00:00Z") });
    expect(resolveStatus("CLEAN", [deleted], false)).toEqual({ ok: true, status: "CLEAN" });
  });
});

describe("determineResponseSource & determineEventSource (LIVE vs BACKFILL)", () => {
  it("LIVE_RESPONSE_MAX_HOURS = 12 jam", () => {
    expect(LIVE_RESPONSE_MAX_HOURS).toBe(12);
  });

  it("determineResponseSource: <= 12 jam -> LIVE, > 12 jam -> BACKFILL", () => {
    const windowEnd = d("2026-10-12T23:00:00Z");
    const h11 = new Date(windowEnd.getTime() + 11 * HOUR);
    const h12 = new Date(windowEnd.getTime() + 12 * HOUR);
    const h13 = new Date(windowEnd.getTime() + 13 * HOUR);

    expect(determineResponseSource(windowEnd, h11)).toBe("LIVE");
    expect(determineResponseSource(windowEnd, h12)).toBe("LIVE");
    expect(determineResponseSource(windowEnd, h13)).toBe("BACKFILL");
  });

  it("determineEventSource: <= 12 jam -> preferredSource, > 12 jam -> BACKFILL", () => {
    const occurredAt = d("2026-10-12T10:00:00Z");
    const loggedAtNormal = d("2026-10-12T15:00:00Z"); // 5 jam kemudian
    const loggedAtLate = d("2026-10-13T02:00:00Z");   // 16 jam kemudian

    expect(determineEventSource(occurredAt, loggedAtNormal, "APP")).toBe("APP");
    expect(determineEventSource(occurredAt, loggedAtNormal, "SOS")).toBe("SOS");
    expect(determineEventSource(occurredAt, loggedAtLate, "APP")).toBe("BACKFILL");
    expect(determineEventSource(occurredAt, loggedAtNormal, "BACKFILL")).toBe("BACKFILL");
  });
});
