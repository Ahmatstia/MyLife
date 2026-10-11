import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/auth";
import { GET as getDashboardRoute } from "@/app/api/tracked-habits/[id]/dashboard/route";
import { POST as acknowledgeRelapseRoute } from "@/app/api/tracked-habits/[id]/relapse/acknowledge/route";
import { POST as resetPlanRoute } from "@/app/api/tracked-habits/[id]/relapse/reset-plan/route";
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

describe("Relapse Pattern Detection & Reset Plan Integration Tests (Langkah 2.5 - T-11 & F-B9)", () => {
  const testUserId = "user_relapse_tester";
  const strangerUserId = "user_relapse_stranger";
  let habitId: string;
  let strangerHabitId: string;
  let habitTriggerId: string;

  beforeAll(async () => {
    // 1. Create primary test user
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        email: "relapse_tester@mylife.test",
        name: "Relapse Tester",
        passwordHash: "secure_hash",
      },
    });

    // 2. Create stranger user
    await prisma.user.upsert({
      where: { id: strangerUserId },
      update: {},
      create: {
        id: strangerUserId,
        email: "relapse_stranger@mylife.test",
        name: "Relapse Stranger",
        passwordHash: "secure_hash",
      },
    });

    // 3. Create habits
    const habit = await prisma.trackedHabit.create({
      data: {
        userId: testUserId,
        name: "Berhenti Begadang Relapse Test",
        kind: "BREAK",
        mode: "ABSTAIN",
        stage: "ACTION",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "20:00",
        startedAt: new Date(Date.now() - 10 * 24 * 3600 * 1000), // 10 hari lalu
        currentWindowStart: new Date(),
        breakProfile: {
          create: {
            whyReasons: ["Tidur teratur untuk kesehatan", "Fokus kerja meningkat"],
            relapseLapseCount: 3,
            relapseWindowDays: 7,
          },
        },
      },
    });
    habitId = habit.id;

    const strangerHabit = await prisma.trackedHabit.create({
      data: {
        userId: strangerUserId,
        name: "Kebiasaan Orang Lain",
        kind: "BREAK",
        mode: "ABSTAIN",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "20:00",
        startedAt: new Date(),
        currentWindowStart: new Date(),
        breakProfile: {
          create: {
            whyReasons: ["Alasan orang lain"],
          },
        },
      },
    });
    strangerHabitId = strangerHabit.id;

    // 4. Create trigger
    const trig = await prisma.trigger.create({
      data: { name: "Main Game Malam Hari", category: "ACTIVITY" },
    });
    const ht = await prisma.habitTrigger.create({
      data: { habitId, triggerId: trig.id, intensity: 4 },
    });
    habitTriggerId = ht.id;
  });

  afterAll(async () => {
    await prisma.copingPlan.deleteMany({
      where: { habitId: { in: [habitId, strangerHabitId] } },
    });
    await prisma.habitCheckin.deleteMany({
      where: { habitId: { in: [habitId, strangerHabitId] } },
    });
    await prisma.habitEvent.deleteMany({
      where: { habitId: { in: [habitId, strangerHabitId] } },
    });
    await prisma.habitTrigger.deleteMany({
      where: { habitId: { in: [habitId, strangerHabitId] } },
    });
    await prisma.habitBreakProfile.deleteMany({
      where: { habitId: { in: [habitId, strangerHabitId] } },
    });
    await prisma.habitStats.deleteMany({
      where: { habitId: { in: [habitId, strangerHabitId] } },
    });
    await prisma.trackedHabit.deleteMany({
      where: { id: { in: [habitId, strangerHabitId] } },
    });
    await prisma.trigger.deleteMany({
      where: { name: "Main Game Malam Hari" },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [testUserId, strangerUserId] } },
    });
  });

  it("Skenario T-11: mendeteksi pola kambuh (3 LAPSED dalam 7 hari) dan mengaktifkan tawaran reset rencana", async () => {
    const now = Date.now();
    const oneDay = 24 * 3600 * 1000;

    // Buat 3 jendela check-in yang LAPSED dalam 7 hari terakhir
    for (let i = 1; i <= 3; i++) {
      const windowStart = new Date(now - (i * 2 + 1) * oneDay);
      const windowEnd = new Date(now - i * 2 * oneDay);
      const periodDate = new Date(windowEnd.getTime() - 12 * 3600 * 1000);

      await prisma.habitCheckin.create({
        data: {
          habitId,
          windowStart,
          windowEnd,
          periodDate,
          status: "LAPSED",
        },
      });

      await prisma.habitEvent.create({
        data: {
          habitId,
          userId: testUserId,
          type: "LAPSE",
          occurredAt: new Date(windowStart.getTime() + 3600 * 1000),
          quantity: 1,
        },
      });
    }

    // Hitung ulang statistik
    const stats = await recomputeHabitStats(habitId);
    expect(stats.relapsePattern).toBe(true);

    // Ambil dashboard via API
    const dashReq = makeRequest(testUserId, `/api/tracked-habits/${habitId}/dashboard`);
    const dashRes = await getDashboardRoute(dashReq, habitContext(habitId));
    const dashJson = await dashRes.json();

    expect(dashRes.status).toBe(200);
    expect(dashJson.success).toBe(true);
    expect(dashJson.data.stats.relapsePattern).toBe(true);
    expect(dashJson.data.activeRelapsePrompt).toBe(true);
  });

  it("Tawaran tidak berulang: setelah di-acknowledge, tawaran tidak lagi muncul di dashboard", async () => {
    // Panggil acknowledge endpoint
    const ackReq = makeRequest(
      testUserId,
      `/api/tracked-habits/${habitId}/relapse/acknowledge`,
      { method: "POST" },
    );
    const ackRes = await acknowledgeRelapseRoute(ackReq, habitContext(habitId));
    const ackJson = await ackRes.json();

    expect(ackRes.status).toBe(200);
    expect(ackJson.success).toBe(true);
    expect(ackJson.data.relapseAckAt).toBeDefined();

    // Periksa dashboard kembali: stats.relapsePattern masih true, namun activeRelapsePrompt harus false!
    const dashReq = makeRequest(testUserId, `/api/tracked-habits/${habitId}/dashboard`);
    const dashRes = await getDashboardRoute(dashReq, habitContext(habitId));
    const dashJson = await dashRes.json();

    expect(dashJson.data.stats.relapsePattern).toBe(true);
    expect(dashJson.data.activeRelapsePrompt).toBe(false);
  });

  it("Alur reset rencana (F-B9): memperbarui alasan, membuat rencana jika-maka baru, dan kembali ke tahap PREPARATION", async () => {
    // Simulasikan kejadian lapse baru yang memicu activeRelapsePrompt kembali
    await prisma.habitBreakProfile.update({
      where: { habitId },
      data: { relapseAckAt: new Date(Date.now() - 3600 * 1000) }, // ack 1 jam lalu
    });
    // Lapse baru sekarang
    await prisma.habitEvent.create({
      data: {
        habitId,
        userId: testUserId,
        type: "LAPSE",
        occurredAt: new Date(),
        quantity: 1,
      },
    });
    await recomputeHabitStats(habitId);

    // Verifikasi activeRelapsePrompt aktif kembali
    const checkReq = makeRequest(testUserId, `/api/tracked-habits/${habitId}/dashboard`);
    const checkRes = await getDashboardRoute(checkReq, habitContext(habitId));
    const checkJson = await checkRes.json();
    expect(checkJson.data.activeRelapsePrompt).toBe(true);

    // Jalankan alur Reset Rencana (F-B9)
    const resetReq = makeRequest(
      testUserId,
      `/api/tracked-habits/${habitId}/relapse/reset-plan`,
      {
        method: "POST",
        body: {
          whyReasons: [
            "Kesehatan jangka panjang & daya tahan tubuh",
            "Bangun pagi dengan segar & produktif",
          ],
          futureSelfNote: "Kamu berharga dan ini proses belajar, bukan kegagalan.",
          newCopingPlan: {
            ifCondition: "merasa ingin main game larut malam",
            thenAction: "segera letakkan ponsel di luar kamar dan baca buku 10 menit",
            habitTriggerId,
          },
        },
      },
    );

    const resetRes = await resetPlanRoute(resetReq, habitContext(habitId));
    const resetJson = await resetRes.json();

    expect(resetRes.status).toBe(200);
    expect(resetJson.success).toBe(true);
    expect(resetJson.data.stage).toBe("PREPARATION");
    expect(resetJson.data.createdCopingPlan).toBeDefined();
    expect(resetJson.data.createdCopingPlan.ifCondition).toBe("merasa ingin main game larut malam");

    // Verifikasi database: habit stage harus berubah ke PREPARATION
    const updatedHabit = await prisma.trackedHabit.findUnique({
      where: { id: habitId },
      include: { breakProfile: true, copingPlans: true },
    });
    expect(updatedHabit?.stage).toBe("PREPARATION");
    expect(updatedHabit?.breakProfile?.whyReasons).toEqual([
      "Kesehatan jangka panjang & daya tahan tubuh",
      "Bangun pagi dengan segar & produktif",
    ]);
    expect(updatedHabit?.breakProfile?.futureSelfNote).toBe(
      "Kamu berharga dan ini proses belajar, bukan kegagalan.",
    );

    // Dashboard: activeRelapsePrompt harus langsung menjadi false
    const postDashReq = makeRequest(testUserId, `/api/tracked-habits/${habitId}/dashboard`);
    const postDashRes = await getDashboardRoute(postDashReq, habitContext(habitId));
    const postDashJson = await postDashRes.json();
    expect(postDashJson.data.habit.stage).toBe("PREPARATION");
    expect(postDashJson.data.activeRelapsePrompt).toBe(false);
  });

  it("Keamanan & IDOR: menolak akses dari pengguna lain ke acknowledge dan reset-plan", async () => {
    // Stranger tries to acknowledge testUserId's habit
    const strangerAckReq = makeRequest(
      strangerUserId,
      `/api/tracked-habits/${habitId}/relapse/acknowledge`,
      { method: "POST" },
    );
    const strangerAckRes = await acknowledgeRelapseRoute(strangerAckReq, habitContext(habitId));
    expect(strangerAckRes.status).toBe(404);

    // Stranger tries to reset testUserId's plan
    const strangerResetReq = makeRequest(
      strangerUserId,
      `/api/tracked-habits/${habitId}/relapse/reset-plan`,
      {
        method: "POST",
        body: { whyReasons: ["Hacked reasons"] },
      },
    );
    const strangerResetRes = await resetPlanRoute(strangerResetReq, habitContext(habitId));
    expect(strangerResetRes.status).toBe(404);
  });
});
