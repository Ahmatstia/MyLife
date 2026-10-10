import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/auth";
import { GET as getMilestonesRoute } from "@/app/api/tracked-habits/[id]/milestones/route";
import { POST as celebrateMilestoneRoute } from "@/app/api/tracked-habits/[id]/milestones/[milestoneId]/celebrate/route";
import { recomputeHabitStats } from "@/services/habits";

const cookie = (userId: string) => `ppos_session=${createSessionToken(userId)}`;

function makeRequest(
  userId: string | null,
  path: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
) {
  const headers: Record<string, string> = {
    ...(options.headers ?? {}),
  };
  if (userId) {
    headers.cookie = cookie(userId);
  }
  if (options.body) {
    headers["content-type"] = "application/json";
  }

  return new Request(`http://localhost${path}`, {
    method: options.method ?? (options.body ? "POST" : "GET"),
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

const habitContext = (id: string) => ({ params: Promise.resolve({ id }) });
const milestoneContext = (id: string, milestoneId: string) => ({
  params: Promise.resolve({ id, milestoneId }),
});

describe("Habit Milestones Integration Tests (Langkah 2.7 - §8.8)", () => {
  const testUserId = "user_milestone_tester";
  const strangerUserId = "user_milestone_stranger";
  let habitId: string;
  let strangerHabitId: string;

  beforeAll(async () => {
    // 1. Setup users
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        email: "milestone_tester@mylife.test",
        name: "Milestone Tester",
        passwordHash: "secure_hash",
      },
    });

    await prisma.user.upsert({
      where: { id: strangerUserId },
      update: {},
      create: {
        id: strangerUserId,
        email: "milestone_stranger@mylife.test",
        name: "Milestone Stranger",
        passwordHash: "secure_hash",
      },
    });

    // 2. Setup habits
    const habit = await prisma.trackedHabit.create({
      data: {
        userId: testUserId,
        name: "Milestone Break Habit",
        kind: "BREAK",
        mode: "ABSTAIN",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "20:00",
        startedAt: new Date(Date.now() - 10 * 24 * 3600 * 1000),
        currentWindowStart: new Date(),
        breakProfile: {
          create: {
            whyReasons: ["Hidup lebih sehat dan tenang"],
          },
        },
      },
    });
    habitId = habit.id;

    const strangerHabit = await prisma.trackedHabit.create({
      data: {
        userId: strangerUserId,
        name: "Stranger Habit",
        kind: "BREAK",
        mode: "ABSTAIN",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "20:00",
        startedAt: new Date(),
        currentWindowStart: new Date(),
      },
    });
    strangerHabitId = strangerHabit.id;
  });

  afterAll(async () => {
    const ids = [habitId, strangerHabitId, recoveryHabitId].filter(Boolean);
    await prisma.habitMilestone.deleteMany({
      where: { habitId: { in: ids } },
    });
    await prisma.habitEvent.deleteMany({
      where: { habitId: { in: ids } },
    });
    await prisma.habitCheckin.deleteMany({
      where: { habitId: { in: ids } },
    });
    await prisma.habitBreakProfile.deleteMany({
      where: { habitId: { in: ids } },
    });
    await prisma.habitStats.deleteMany({
      where: { habitId: { in: ids } },
    });
    await prisma.trackedHabit.deleteMany({
      where: { id: { in: ids } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [testUserId, strangerUserId] } },
    });
  });

  it("mencatat milestone STREAK_1, STREAK_3, dan STREAK_7 secara otomatis saat recomputeHabitStats", async () => {
    const now = Date.now();
    const oneDay = 24 * 3600 * 1000;

    // Buat 7 hari checkin CLEAN berurutan
    for (let i = 7; i >= 1; i--) {
      const windowStart = new Date(now - i * oneDay);
      const windowEnd = new Date(now - (i - 1) * oneDay);
      const periodDate = new Date(windowEnd.getTime() - 12 * 3600 * 1000);

      await prisma.habitCheckin.create({
        data: {
          habitId,
          windowStart,
          windowEnd,
          periodDate,
          status: "CLEAN",
        },
      });
    }

    // Recompute stats
    const stats = await recomputeHabitStats(habitId);
    expect(stats.currentStreakDays).toBe(7);

    // Verifikasi milestone di database
    const milestones = await prisma.habitMilestone.findMany({
      where: { habitId },
      orderBy: { code: "asc" },
    });
    const codes = milestones.map((m) => m.code);

    expect(codes).toContain("STREAK_1");
    expect(codes).toContain("STREAK_3");
    expect(codes).toContain("STREAK_7");
    expect(codes).not.toContain("STREAK_14");
  });

  let recoveryHabitId: string;

  it("mencatat FIRST_URGE_RESISTED, FIRST_DEBRIEF, dan RETURNED_AFTER_SLIP", async () => {
    const recoveryHabit = await prisma.trackedHabit.create({
      data: {
        userId: testUserId,
        name: "Recovery Test Habit",
        kind: "BREAK",
        mode: "ABSTAIN",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "20:00",
        startedAt: new Date(Date.now() - 10 * 24 * 3600 * 1000),
        currentWindowStart: new Date(),
      },
    });
    recoveryHabitId = recoveryHabit.id;

    // 1. Simpan URGE event yang resisted
    await prisma.habitEvent.create({
      data: {
        habitId: recoveryHabitId,
        userId: testUserId,
        type: "URGE",
        occurredAt: new Date(),
        outcome: "RESISTED",
      },
    });

    // 2. Simpan LAPSE event di masa lalu yang memiliki meta.debrief
    await prisma.habitEvent.create({
      data: {
        habitId: recoveryHabitId,
        userId: testUserId,
        type: "LAPSE",
        occurredAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
        meta: {
          debrief: {
            whatHappened: "Situasi lelah malam hari",
          },
        },
      },
    });

    // 3. Simpan check-in CLEAN setelah lapse tersebut (kembali bangkit)
    await prisma.habitCheckin.create({
      data: {
        habitId: recoveryHabitId,
        windowStart: new Date(Date.now() - 24 * 3600 * 1000),
        windowEnd: new Date(),
        periodDate: new Date(Date.now() - 12 * 3600 * 1000),
        status: "CLEAN",
      },
    });

    await recomputeHabitStats(recoveryHabitId);

    const milestones = await prisma.habitMilestone.findMany({
      where: { habitId: recoveryHabitId },
    });
    const codes = milestones.map((m) => m.code);

    expect(codes).toContain("FIRST_URGE_RESISTED");
    expect(codes).toContain("FIRST_DEBRIEF");
    expect(codes).toContain("RETURNED_AFTER_SLIP");
  });

  it("GET /api/tracked-habits/[id]/milestones mengembalikan daftar milestone tanpa klaim medis", async () => {
    const req = makeRequest(testUserId, `/api/tracked-habits/${habitId}/milestones`);
    const res = await getMilestonesRoute(req, habitContext(habitId));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.achieved.length).toBeGreaterThanOrEqual(3);
    expect(json.data.allMilestones.length).toBe(13);

    // Verifikasi kepatuhan: dilarang mengandung klaim medis/organ tubuh
    const forbiddenMedicalTerms = ["paru-paru", "dopamin", "jantung", "sembuh total", "racun hilang"];
    for (const m of json.data.allMilestones) {
      const text = `${m.title} ${m.description}`.toLowerCase();
      for (const term of forbiddenMedicalTerms) {
        expect(text).not.toContain(term);
      }
    }
  });

  it("POST /milestones/[id]/celebrate menandai celebratedAt dan membersihkan dari uncelebrated", async () => {
    // Ambil milestone yang belum dirayakan
    const uncelebrated = await prisma.habitMilestone.findFirst({
      where: { habitId, celebratedAt: null },
    });
    expect(uncelebrated).not.toBeNull();
    const milestoneId = uncelebrated!.id;

    // Rayakan milestone
    const celReq = makeRequest(
      testUserId,
      `/api/tracked-habits/${habitId}/milestones/${milestoneId}/celebrate`,
      { method: "POST" },
    );
    const celRes = await celebrateMilestoneRoute(celReq, milestoneContext(habitId, milestoneId));
    const celJson = await celRes.json();

    expect(celRes.status).toBe(200);
    expect(celJson.success).toBe(true);
    expect(celJson.data.milestone.celebratedAt).not.toBeNull();

    // Verifikasi di endpoint GET
    const getReq = makeRequest(testUserId, `/api/tracked-habits/${habitId}/milestones`);
    const getRes = await getMilestonesRoute(getReq, habitContext(habitId));
    const getJson = await getRes.json();

    const stillUncelebratedIds = getJson.data.uncelebrated.map((m: { id: string }) => m.id);
    expect(stillUncelebratedIds).not.toContain(milestoneId);
  });

  it("IDOR: menolak user lain mengakses atau merayakan milestone", async () => {
    const milestone = await prisma.habitMilestone.findFirst({
      where: { habitId },
    });
    expect(milestone).not.toBeNull();

    // Stranger calls GET
    const strangerGetReq = makeRequest(
      strangerUserId,
      `/api/tracked-habits/${habitId}/milestones`,
    );
    const strangerGetRes = await getMilestonesRoute(strangerGetReq, habitContext(habitId));
    expect(strangerGetRes.status).toBe(404);

    // Stranger calls POST celebrate
    const strangerCelReq = makeRequest(
      strangerUserId,
      `/api/tracked-habits/${habitId}/milestones/${milestone!.id}/celebrate`,
      { method: "POST" },
    );
    const strangerCelRes = await celebrateMilestoneRoute(
      strangerCelReq,
      milestoneContext(habitId, milestone!.id),
    );
    expect(strangerCelRes.status).toBe(404);
  });
});
