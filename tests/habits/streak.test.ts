import { describe, expect, it } from "vitest";
import { computeStats, UnsupportedHabitError, type CheckinLike } from "@/lib/habits/streak";
import type { CheckinStatus, HabitEventLike } from "@/lib/habits/status";
import { BREAK_ABSTAIN, d, dailyCheckins, lapseAt } from "./helpers";

// Akhir jendela ke-k (1-based) = 10 Okt 23:00Z + (k-1) hari
const endOf = (k: number) => new Date(d("2026-10-10T23:00:00Z").getTime() + (k - 1) * 24 * 3600 * 1000);
const afterAll = (n: number) => new Date(endOf(n).getTime() + 3600 * 1000);

describe("computeStats: dasar", () => {
  it("tanpa data -> semua nol/null", () => {
    expect(computeStats([], [], BREAK_ABSTAIN, d("2026-10-10T00:00:00Z"))).toEqual({
      currentStreakDays: 0,
      longestStreakDays: 0,
      confirmedCleanDays: 0,
      cleanRate30d: null,
      lastLapseAt: null,
      totalLapses: 0,
      urgesResisted: 0,
    });
  });

  it("5 jendela CLEAN -> streak 5, clean rate 100", () => {
    const checkins = dailyCheckins(Array(5).fill("CLEAN"));
    const s = computeStats(checkins, [], BREAK_ABSTAIN, afterAll(5));
    expect(s).toMatchObject({
      currentStreakDays: 5,
      longestStreakDays: 5,
      confirmedCleanDays: 5,
      cleanRate30d: 100,
      totalLapses: 0,
    });
  });

  it("menolak kebiasaan selain BREAK/ABSTAIN (Fase 1)", () => {
    expect(() => computeStats([], [], { kind: "BUILD", mode: null }, new Date())).toThrow(UnsupportedHabitError);
    expect(() => computeStats([], [], { kind: "BREAK", mode: "REDUCE" }, new Date())).toThrow(UnsupportedHabitError);
  });

  it("jendela yang belum berakhir diabaikan", () => {
    const checkins = dailyCheckins(["CLEAN", "CLEAN", "CLEAN"]);
    const s = computeStats(checkins, [], BREAK_ABSTAIN, new Date(endOf(2).getTime() + 1000));
    expect(s.currentStreakDays).toBe(2);
  });
});

describe("T-06: terpeleset 23:40, check-in 06:00", () => {
  it("check-in LAPSED, streak 0, streak terbaik tetap, lastLapseAt benar", () => {
    const checkins = dailyCheckins(["CLEAN", "CLEAN", "LAPSED"]);
    const lapse = lapseAt("2026-10-12T16:40:00Z"); // 12 Okt 23:40 WIB
    const s = computeStats(checkins, [lapse], BREAK_ABSTAIN, afterAll(3));
    expect(s.currentStreakDays).toBe(0);
    expect(s.longestStreakDays).toBe(2);
    expect(s.confirmedCleanDays).toBe(2);
    expect(s.totalLapses).toBe(1);
    expect(s.lastLapseAt?.toISOString()).toBe("2026-10-12T16:40:00.000Z");
    expect(s.cleanRate30d).toBe(66.67);
  });
});

describe("PENDING & UNCONFIRMED", () => {
  it("T-07: PENDING terbaru tidak dihitung dan tidak memutus streak", () => {
    const checkins = dailyCheckins(["CLEAN", "CLEAN", "PENDING"]);
    const s = computeStats(checkins, [], BREAK_ABSTAIN, afterAll(3));
    expect(s.currentStreakDays).toBe(2);
    expect(s.longestStreakDays).toBe(2);
    expect(s.confirmedCleanDays).toBe(2);
  });

  it("PENDING di tengah deret tidak memutus", () => {
    const checkins = dailyCheckins(["CLEAN", "PENDING", "CLEAN"]);
    const s = computeStats(checkins, [], BREAK_ABSTAIN, afterAll(3));
    expect(s.currentStreakDays).toBe(2);
    expect(s.longestStreakDays).toBe(2);
  });

  it("T-08: UNCONFIRMED tanpa lapse melanjutkan streak, tidak masuk penyebut clean rate", () => {
    const checkins = dailyCheckins(["CLEAN", "UNCONFIRMED", "CLEAN", "LAPSED"]);
    const s = computeStats(checkins, [lapseAt("2026-10-13T05:00:00Z")], BREAK_ABSTAIN, afterAll(4));
    expect(s.longestStreakDays).toBe(3);
    expect(s.currentStreakDays).toBe(0);
    expect(s.confirmedCleanDays).toBe(2);
    expect(s.cleanRate30d).toBe(66.67); // 2 CLEAN / (2 CLEAN + 1 LAPSED)

    const onlyUnconfirmed = dailyCheckins(["UNCONFIRMED", "UNCONFIRMED"]);
    const s2 = computeStats(onlyUnconfirmed, [], BREAK_ABSTAIN, afterAll(2));
    expect(s2.currentStreakDays).toBe(2);
    expect(s2.confirmedCleanDays).toBe(0);
    expect(s2.cleanRate30d).toBeNull();
  });
});

describe("T-09 / T-10: backfill dan hapus event", () => {
  const rows: CheckinStatus[] = Array(7).fill("CLEAN");
  const checkins = dailyCheckins(rows);
  const backfilled = lapseAt("2026-10-12T05:00:00Z"); // di jendela ke-3 (baris masih tertulis CLEAN)
  const now = afterAll(7);

  it("T-09: backfill terpeleset 5 hari lalu -> jendela terkait LAPSED, statistik dihitung ulang", () => {
    const s = computeStats(checkins, [backfilled], BREAK_ABSTAIN, now);
    expect(s.currentStreakDays).toBe(4);
    expect(s.longestStreakDays).toBe(4);
    expect(s.confirmedCleanDays).toBe(6);
    expect(s.cleanRate30d).toBe(85.71);
    expect(s.totalLapses).toBe(1);
    expect(s.lastLapseAt?.toISOString()).toBe("2026-10-12T05:00:00.000Z");
  });

  it("T-10: hapus event LAPSE -> streak naik kembali", () => {
    const deleted = { ...backfilled, deletedAt: d("2026-10-17T01:00:00Z") };
    const s = computeStats(checkins, [deleted], BREAK_ABSTAIN, now);
    expect(s.currentStreakDays).toBe(7);
    expect(s.longestStreakDays).toBe(7);
    expect(s.totalLapses).toBe(0);
    expect(s.lastLapseAt).toBeNull();
    expect(s.cleanRate30d).toBe(100);
  });

  it("lastLapseAt memakai LAPSE aktif terbaru", () => {
    const older = lapseAt("2026-10-11T05:00:00Z");
    const newest = lapseAt("2026-10-14T05:00:00Z");
    const s = computeStats(checkins, [older, newest], BREAK_ABSTAIN, now);
    expect(s.lastLapseAt?.toISOString()).toBe("2026-10-14T05:00:00.000Z");
    expect(s.totalLapses).toBe(2);
  });
});

describe("urgesResisted", () => {
  it("hanya URGE RESISTED yang aktif", () => {
    const events: HabitEventLike[] = [
      { type: "URGE", occurredAt: d("2026-10-11T10:00:00Z"), outcome: "RESISTED" },
      { type: "URGE", occurredAt: d("2026-10-11T11:00:00Z"), outcome: "RESISTED" },
      { type: "URGE", occurredAt: d("2026-10-11T12:00:00Z"), outcome: "GAVE_IN" },
      { type: "URGE", occurredAt: d("2026-10-11T13:00:00Z"), outcome: "RESISTED", deletedAt: d("2026-10-12T00:00:00Z") },
      { type: "LAPSE", occurredAt: d("2026-10-11T14:00:00Z") },
    ];
    const s = computeStats(dailyCheckins(["CLEAN"]), events, BREAK_ABSTAIN, afterAll(1));
    expect(s.urgesResisted).toBe(2);
  });
});

describe("cleanRate30d memakai 30 jendela terakhir", () => {
  it("LAPSED di luar 30 jendela terakhir tidak ikut", () => {
    const statuses: CheckinStatus[] = ["LAPSED", "LAPSED", ...Array<CheckinStatus>(30).fill("CLEAN")];
    const s = computeStats(dailyCheckins(statuses), [], BREAK_ABSTAIN, afterAll(32));
    expect(s.cleanRate30d).toBe(100);
    expect(s.currentStreakDays).toBe(30);
    expect(s.longestStreakDays).toBe(30);
  });

  it("LAPSED di dalam 30 jendela terakhir ikut", () => {
    const statuses: CheckinStatus[] = ["LAPSED", ...Array<CheckinStatus>(29).fill("CLEAN"), ...Array<CheckinStatus>(0)];
    const s = computeStats(dailyCheckins(statuses), [], BREAK_ABSTAIN, afterAll(30));
    expect(s.cleanRate30d).toBe(96.67);
  });
});

// ─── Property tests (PRNG ber-seed, tanpa dependensi tambahan) ────────────────

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POOL: CheckinStatus[] = ["CLEAN", "CLEAN", "CLEAN", "UNCONFIRMED", "LAPSED", "PENDING"];

function randomScenario(rand: () => number) {
  const n = 1 + Math.floor(rand() * 40);
  const statuses = Array.from({ length: n }, () => POOL[Math.floor(rand() * POOL.length)]);
  const checkins = dailyCheckins(statuses);
  // event LAPSE acak di dalam rentang jendela; sebagian dihapus
  const events: HabitEventLike[] = [];
  const lapseCount = Math.floor(rand() * 6);
  for (let i = 0; i < lapseCount; i++) {
    const w = checkins[Math.floor(rand() * n)];
    const span = w.windowEnd.getTime() - w.windowStart.getTime();
    const at = new Date(w.windowStart.getTime() + Math.floor(rand() * span));
    events.push({
      type: "LAPSE",
      occurredAt: at,
      deletedAt: rand() < 0.3 ? new Date(at.getTime() + 1000) : null,
    });
  }
  return { checkins, events, now: afterAll(n) };
}

/** Referensi inkremental sederhana: memproses jendela satu per satu dari yang terlama. */
function incrementalReference(checkins: readonly CheckinLike[], events: readonly HabitEventLike[]) {
  const sorted = [...checkins].sort((a, b) => a.windowEnd.getTime() - b.windowEnd.getTime());
  let current = 0;
  let longest = 0;
  for (const c of sorted) {
    const hasLapse = events.some(
      (e) =>
        e.type === "LAPSE" &&
        e.deletedAt == null &&
        e.occurredAt.getTime() >= c.windowStart.getTime() &&
        e.occurredAt.getTime() < c.windowEnd.getTime(),
    );
    const lapsed = hasLapse || c.status === "LAPSED";
    if (lapsed) {
      current = 0;
    } else if (c.status === "CLEAN" || c.status === "UNCONFIRMED") {
      current++;
      longest = Math.max(longest, current);
    } // PENDING: dilewati
  }
  return { current, longest };
}

function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

describe("invarian (property test, 300 skenario acak)", () => {
  it("currentStreakDays <= longestStreakDays dan batas nilai wajar", () => {
    const rand = mulberry32(20261010);
    for (let i = 0; i < 300; i++) {
      const { checkins, events, now } = randomScenario(rand);
      const s = computeStats(checkins, events, BREAK_ABSTAIN, now);
      expect(s.currentStreakDays).toBeLessThanOrEqual(s.longestStreakDays);
      expect(s.longestStreakDays).toBeLessThanOrEqual(checkins.length);
      expect(s.confirmedCleanDays).toBeLessThanOrEqual(checkins.length);
      if (s.cleanRate30d !== null) {
        expect(s.cleanRate30d).toBeGreaterThanOrEqual(0);
        expect(s.cleanRate30d).toBeLessThanOrEqual(100);
      }
    }
  });

  it("menghitung ulang dari nol = hasil inkremental (referensi), dan tidak bergantung urutan input", () => {
    const rand = mulberry32(42);
    for (let i = 0; i < 300; i++) {
      const { checkins, events, now } = randomScenario(rand);
      const full = computeStats(checkins, events, BREAK_ABSTAIN, now);
      const ref = incrementalReference(checkins, events);
      expect(full.currentStreakDays).toBe(ref.current);
      expect(full.longestStreakDays).toBe(ref.longest);

      const shuffled = computeStats(shuffle(checkins, rand), shuffle(events, rand), BREAK_ABSTAIN, now);
      expect(shuffled).toEqual(full);
    }
  });

  it("menambah jendela satu per satu (prefix) selalu konsisten dengan referensi", () => {
    const rand = mulberry32(7);
    const { checkins, events } = randomScenario(rand);
    for (let k = 1; k <= checkins.length; k++) {
      const prefix = checkins.slice(0, k);
      const s = computeStats(prefix, events, BREAK_ABSTAIN, afterAll(k));
      const ref = incrementalReference(prefix, events);
      expect(s.currentStreakDays).toBe(ref.current);
      expect(s.longestStreakDays).toBe(ref.longest);
    }
  });
});
