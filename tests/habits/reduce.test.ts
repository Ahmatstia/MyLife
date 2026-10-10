import { describe, it, expect } from "vitest";
import {
  dailyLimit,
  sumOccurrences,
  resolveReduceStatus,
  type OccurrenceEventLike,
} from "@/lib/habits/reduce";

describe("Habits v2 - Pure Logic Mode REDUCE (§8.4, §12.6)", () => {
  describe("dailyLimit()", () => {
    it("mengembalikan batas awal jika belum ada hari yang berlalu", () => {
      const profile = {
        reduceDailyLimit: 10,
        reduceStepPercent: 10,
        reduceStepEveryDays: 7,
      };
      expect(dailyLimit(profile, 0)).toBe(10);
      expect(dailyLimit(profile, 3)).toBe(10);
      expect(dailyLimit(profile, 6)).toBe(10);
    });

    it("mengurangi kuota secara bertahap sesuai jadwal penurunan", () => {
      const profile = {
        reduceDailyLimit: 10,
        reduceStepPercent: 10, // -10% per step
        reduceStepEveryDays: 7,
      };

      // Hari ke-7 (step 1): 10 * (1 - 0.1) = 9
      expect(dailyLimit(profile, 7)).toBe(9);
      expect(dailyLimit(profile, 10)).toBe(9);

      // Hari ke-14 (step 2): 10 * (0.9)^2 = 8.1 -> round ke 8
      expect(dailyLimit(profile, 14)).toBe(8);

      // Hari ke-21 (step 3): 10 * (0.9)^3 = 7.29 -> round ke 7
      expect(dailyLimit(profile, 21)).toBe(7);
    });

    it("menggunakan baselinePerDay jika reduceDailyLimit tidak ditentukan", () => {
      const profile = {
        baselinePerDay: 5,
        reduceStepPercent: 20,
        reduceStepEveryDays: 5,
      };

      expect(dailyLimit(profile, 0)).toBe(5);
      // Hari ke-5 (step 1): 5 * 0.8 = 4
      expect(dailyLimit(profile, 5)).toBe(4);
    });

    it("menjamin batas harian tidak pernah di bawah 0 meskipun waktu berlalu sangat lama", () => {
      const profile = {
        reduceDailyLimit: 3,
        reduceStepPercent: 50,
        reduceStepEveryDays: 7,
      };

      // Setelah 365 hari (52 steps): 3 * (0.5)^52 mendekati 0
      const limit = dailyLimit(profile, 365);
      expect(limit).toBeGreaterThanOrEqual(0);
      expect(limit).toBe(0);
    });

    it("aman terhadap parameter tidak wajar atau interval 0", () => {
      expect(dailyLimit({ reduceDailyLimit: 5, reduceStepEveryDays: 0 }, 10)).toBe(5);
      expect(dailyLimit({ reduceDailyLimit: 5, reduceStepPercent: 0 }, 10)).toBe(5);
      expect(dailyLimit({ reduceDailyLimit: 5 }, -5)).toBe(5);
      expect(dailyLimit({}, 10)).toBe(0);
    });
  });

  describe("sumOccurrences()", () => {
    it("menghitung total kuantitas hanya dari event OCCURRENCE aktif", () => {
      const events: OccurrenceEventLike[] = [
        { type: "OCCURRENCE", occurredAt: new Date(), quantity: 2 },
        { type: "OCCURRENCE", occurredAt: new Date(), quantity: 1.5 },
        { type: "URGE", occurredAt: new Date(), quantity: 5 }, // diabaikan karena bukan OCCURRENCE
        { type: "OCCURRENCE", occurredAt: new Date(), quantity: 3, deletedAt: new Date() }, // diabaikan karena deleted
      ];

      expect(sumOccurrences(events)).toBe(3.5);
    });

    it("menggunakan default quantity 1 jika tidak diisi", () => {
      const events: OccurrenceEventLike[] = [
        { type: "OCCURRENCE", occurredAt: new Date() },
      ];

      expect(sumOccurrences(events)).toBe(1);
    });
  });

  describe("resolveReduceStatus()", () => {
    it("menghasilkan OVER_LIMIT jika total kejadian melebihi kuota harian", () => {
      const events: OccurrenceEventLike[] = [
        { type: "OCCURRENCE", occurredAt: new Date(), quantity: 2 },
        { type: "OCCURRENCE", occurredAt: new Date(), quantity: 2 },
      ];

      // Kuota = 3, Total kejadian = 4 -> OVER_LIMIT
      const res = resolveReduceStatus(null, events, 3, false);
      expect(res.status).toBe("OVER_LIMIT");
      expect(res.totalQuantity).toBe(4);
    });

    it("menghasilkan PENDING jika total kejadian masih di bawah batas dan jendela belum berakhir", () => {
      const events: OccurrenceEventLike[] = [
        { type: "OCCURRENCE", occurredAt: new Date(), quantity: 1 },
      ];

      // Kuota = 3, Total = 1, belum gracePassed & belum dijawab -> PENDING
      const res = resolveReduceStatus(null, events, 3, false);
      expect(res.status).toBe("PENDING");
      expect(res.totalQuantity).toBe(1);
    });

    it("menghasilkan WITHIN_LIMIT jika total kejadian <= batas saat dijawab atau setelah masa tenggang", () => {
      const events: OccurrenceEventLike[] = [
        { type: "OCCURRENCE", occurredAt: new Date(), quantity: 2 },
      ];

      // Kuota = 3, dijawab WITHIN_LIMIT -> WITHIN_LIMIT
      const answered = resolveReduceStatus("WITHIN_LIMIT", events, 3, false);
      expect(answered.status).toBe("WITHIN_LIMIT");

      // Kuota = 3, masa tenggang lewat tanpa jawaban -> WITHIN_LIMIT
      const gracePassed = resolveReduceStatus(null, events, 3, true);
      expect(gracePassed.status).toBe("WITHIN_LIMIT");
    });
  });
});
