import { describe, expect, it } from "vitest";
import { RelapseDetector, detectRelapsePattern } from "@/lib/habits/relapse";
import type { CheckinStatus } from "@/lib/habits/status";
import { d } from "./helpers";

const NOW = d("2026-10-17T00:00:00Z");
const DAY = 24 * 3600 * 1000;
const at = (daysAgo: number) => new Date(NOW.getTime() - daysAgo * DAY);
const ck = (daysAgo: number, status: CheckinStatus) => ({ windowEnd: at(daysAgo), status });
const rule = { count: 3, days: 7 };

describe("RelapseDetector.detect", () => {
  it("tepat pada ambang: 3 LAPSED dalam 7 hari -> true", () => {
    const checkins = [ck(1, "LAPSED"), ck(3, "LAPSED"), ck(5, "LAPSED"), ck(2, "CLEAN")];
    expect(RelapseDetector.detect(checkins, rule, NOW)).toBe(true);
  });

  it("satu di bawah ambang: 2 LAPSED -> false", () => {
    const checkins = [ck(1, "LAPSED"), ck(3, "LAPSED"), ck(2, "CLEAN"), ck(4, "CLEAN")];
    expect(RelapseDetector.detect(checkins, rule, NOW)).toBe(false);
  });

  it("LAPSED di luar jendela 7 hari tidak dihitung", () => {
    const checkins = [ck(1, "LAPSED"), ck(3, "LAPSED"), ck(8, "LAPSED"), ck(20, "LAPSED")];
    expect(RelapseDetector.detect(checkins, rule, NOW)).toBe(false);
  });

  it("batas jendela inklusif: windowEnd tepat 7 hari lalu dihitung", () => {
    const checkins = [ck(1, "LAPSED"), ck(3, "LAPSED"), ck(7, "LAPSED")];
    expect(RelapseDetector.detect(checkins, rule, NOW)).toBe(true);
    const justOutside = [ck(1, "LAPSED"), ck(3, "LAPSED"), { windowEnd: new Date(at(7).getTime() - 1), status: "LAPSED" as const }];
    expect(RelapseDetector.detect(justOutside, rule, NOW)).toBe(false);
  });

  it("status selain LAPSED dan jendela di masa depan tidak dihitung", () => {
    const checkins = [
      ck(1, "LAPSED"),
      ck(2, "UNCONFIRMED"),
      ck(3, "PENDING"),
      ck(4, "CLEAN"),
      { windowEnd: new Date(NOW.getTime() + DAY), status: "LAPSED" as const },
    ];
    expect(RelapseDetector.detect(checkins, rule, NOW)).toBe(false);
  });

  it("aturan bawaan 3 dalam 7 hari bila rule tidak diberikan", () => {
    const three = [ck(1, "LAPSED"), ck(2, "LAPSED"), ck(3, "LAPSED")];
    expect(RelapseDetector.detect(three, undefined, NOW)).toBe(true);
    expect(RelapseDetector.detect(three.slice(0, 2), undefined, NOW)).toBe(false);
  });

  it("aturan kustom dihormati", () => {
    const checkins = [ck(1, "LAPSED"), ck(2, "LAPSED"), ck(10, "LAPSED")];
    expect(RelapseDetector.detect(checkins, { count: 2, days: 3 }, NOW)).toBe(true);
    expect(RelapseDetector.detect(checkins, { count: 3, days: 30 }, NOW)).toBe(true);
    expect(RelapseDetector.detect(checkins, { count: 3, days: 7 }, NOW)).toBe(false);
  });

  it("tanpa check-in -> false", () => {
    expect(RelapseDetector.detect([], rule, NOW)).toBe(false);
  });

  it("menolak aturan tidak valid", () => {
    expect(() => RelapseDetector.detect([], { count: 0, days: 7 }, NOW)).toThrow();
    expect(() => RelapseDetector.detect([], { count: 3, days: 0 }, NOW)).toThrow();
    expect(() => RelapseDetector.detect([], { count: 1.5, days: 7 }, NOW)).toThrow();
    expect(() => RelapseDetector.detect([], { count: 3, days: -1 }, NOW)).toThrow();
  });

  it("alias detectRelapsePattern identik", () => {
    expect(detectRelapsePattern([ck(1, "LAPSED")], { count: 1, days: 7 }, NOW)).toBe(true);
  });
});
