import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { FakeClock } from "@/lib/habits/clock";
import { HabitKind } from "@/generated/prisma/client";
import {
  createTrackedHabitService,
} from "@/services/habits/habit-v2.service";
import { getHabitInsightsService } from "@/services/habits/insight.service";

describe("Habits v2 - Langkah 4.2: Habit Insights Integration Tests (PostgreSQL)", () => {
  let user1Id: string;
  let user2Id: string;

  beforeAll(async () => {
    const u1 = await prisma.user.create({
      data: {
        email: `insights-u1-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
        name: "Insights User 1",
      },
    });
    const u2 = await prisma.user.create({
      data: {
        email: `insights-u2-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
        name: "Insights User 2",
      },
    });
    user1Id = u1.id;
    user2Id = u2.id;
  });

  afterAll(async () => {
    if (user1Id) await prisma.user.delete({ where: { id: user1Id } }).catch(() => {});
    if (user2Id) await prisma.user.delete({ where: { id: user2Id } }).catch(() => {});
  });

  it("IDOR Protection: User 2 tidak dapat mengakses wawasan habit milik User 1", async () => {
    const habit = await createTrackedHabitService(user1Id, {
      name: "Habit Rahasia",
      kind: HabitKind.BREAK,
      mode: "ABSTAIN",
      timezone: "Asia/Jakarta",
      checkinLocalTime: "20:00",
      startedAt: new Date(),
      whyReasons: ["Menjaga kesehatan"],
    });

    await expect(getHabitInsightsService(user2Id, habit.id)).rejects.toThrow(
      "Kebiasaan tidak ditemukan"
    );
  });

  it("Ambang batas data: mengembalikan hasSufficientData: false jika data < 14 hari atau < 10 event", async () => {
    const clock = new FakeClock(new Date("2026-10-10T12:00:00.000Z"));

    const habit = await createTrackedHabitService(
      user1Id,
      {
        name: "Kurangi Kafein",
        kind: HabitKind.BREAK,
        mode: "ABSTAIN",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "20:00",
        startedAt: new Date("2026-10-05T00:00:00.000Z"), // baru 5 hari
        whyReasons: ["Tidur lebih nyenyak"],
      },
      clock
    );

    const result = await getHabitInsightsService(user1Id, habit.id, 60, prisma, clock);
    expect(result.hasSufficientData).toBe(false);
    expect(result.threshold.actualDays).toBe(5);
    expect(result.threshold.requiredDays).toBe(14);
    expect(result.insights).toHaveLength(0);
    expect(result.heatmap.grid).toHaveLength(7);
  });

  it("Menghasilkan insight ketika data memenuhi ambang batas (>= 14 hari & >= 10 event)", async () => {
    // 30 hari pelacakan
    const habitStartedAt = new Date("2026-09-10T00:00:00.000Z");
    const clock = new FakeClock(new Date("2026-10-10T12:00:00.000Z"));

    const habit = await createTrackedHabitService(
      user1Id,
      {
        name: "Kurangi Merokok",
        kind: HabitKind.BREAK,
        mode: "ABSTAIN",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "20:00",
        startedAt: habitStartedAt,
        whyReasons: ["Bernapas lebih lega"],
      },
      clock
    );

    // Buat trigger kustom
    const trigger = await prisma.trigger.create({
      data: {
        userId: user1Id,
        name: "Stres Pekerjaan",
        category: "EMOTION",
      },
    });

    const habitTrigger = await prisma.habitTrigger.create({
      data: {
        habitId: habit.id,
        triggerId: trigger.id,
        intensity: 4,
      },
    });

    // Buat 12 events URGE/LAPSE dengan kluster di jam 21:00 (14:00 UTC) pada hari Jumat
    const eventDates = [
      new Date("2026-10-09T14:00:00.000Z"), // Jumat
      new Date("2026-10-02T14:00:00.000Z"), // Jumat
      new Date("2026-09-25T14:00:00.000Z"), // Jumat
      new Date("2026-09-18T14:00:00.000Z"), // Jumat
      new Date("2026-10-08T08:00:00.000Z"),
      new Date("2026-10-07T08:00:00.000Z"),
      new Date("2026-10-06T08:00:00.000Z"),
      new Date("2026-10-05T08:00:00.000Z"),
      new Date("2026-10-04T08:00:00.000Z"),
      new Date("2026-10-03T08:00:00.000Z"),
      new Date("2026-10-01T08:00:00.000Z"),
      new Date("2026-09-30T08:00:00.000Z"),
    ];

    for (let i = 0; i < eventDates.length; i++) {
      const ev = await prisma.habitEvent.create({
        data: {
          habitId: habit.id,
          userId: user1Id,
          type: "URGE",
          occurredAt: eventDates[i],
          mood: 2,
          halt: ["TIRED", "BORED"],
          meta: { durationMinutes: 12 },
        },
      });

      // Tautkan trigger ke beberapa event
      if (i < 5) {
        await prisma.habitEventTrigger.create({
          data: {
            eventId: ev.id,
            habitTriggerId: habitTrigger.id,
          },
        });
      }
    }

    const result = await getHabitInsightsService(user1Id, habit.id, 60, prisma, clock);
    expect(result.hasSufficientData).toBe(true);
    expect(result.threshold.actualDays).toBeGreaterThanOrEqual(14);
    expect(result.threshold.actualEvents).toBeGreaterThanOrEqual(10);
    expect(result.insights.length).toBeGreaterThan(0);

    // Verifikasi keberadaan evidence dasar data pada setiap insight
    for (const insight of result.insights) {
      expect(insight.evidence).toBeDefined();
      expect(insight.evidence.sampleSize).toBeGreaterThan(0);
      expect(insight.text).toBeDefined();
    }

    // Verifikasi Heatmap 7x24
    expect(result.heatmap.maxCount).toBeGreaterThanOrEqual(4);
  });
});
