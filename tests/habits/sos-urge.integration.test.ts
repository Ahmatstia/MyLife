import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/auth";
import { POST as logEventRoute } from "@/app/api/tracked-habits/[id]/events/route";
import { GET as getDashboardRoute } from "@/app/api/tracked-habits/[id]/dashboard/route";
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

describe("SOS Urge Surfing & URGE Events Integration Tests (Langkah 2.3)", () => {
  const testUserId = "user_sos_urge_tester";
  let habitId: string;
  let copingPlanId: string;

  beforeAll(async () => {
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        email: "sos_tester@mylife.test",
        name: "SOS Urge Tester",
        passwordHash: "secure_hash",
      },
    });

    const habit = await prisma.trackedHabit.create({
      data: {
        userId: testUserId,
        name: "Berhenti Merokok SOS Test",
        kind: "BREAK",
        mode: "ABSTAIN",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "20:00",
        startedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000), // Dimulai 5 hari lalu
        currentWindowStart: new Date(),
        breakProfile: {
          create: {
            whyReasons: ["Kesehatan paru-paru", "Hemat uang"],
          },
        },
      },
    });
    habitId = habit.id;

    // Buat check-in CLEAN untuk membangun streak 3 hari
    const now = Date.now();
    for (let i = 4; i >= 2; i--) {
      const windowStart = new Date(now - i * 24 * 3600 * 1000);
      const windowEnd = new Date(now - (i - 1) * 24 * 3600 * 1000);
      await prisma.habitCheckin.create({
        data: {
          habitId,
          periodDate: windowEnd,
          windowStart,
          windowEnd,
          status: "CLEAN",
        },
      });
    }

    // Buat rencana jika-maka untuk uji korelasi
    const plan = await prisma.copingPlan.create({
      data: {
        habitId,
        ifCondition: "Jika dorongan merokok muncul saat stres",
        thenAction: "Latihan Box Breathing 4-4-4-4 selama 3 menit",
        timesUsed: 0,
        timesHelped: 0,
      },
    });
    copingPlanId = plan.id;

    // Hitung ulang statistik awal (streak 3 hari)
    await recomputeHabitStats(habitId);
  });

  afterAll(async () => {
    await prisma.copingPlan.deleteMany({ where: { habitId } });
    await prisma.habitEvent.deleteMany({ where: { habitId } });
    await prisma.habitCheckin.deleteMany({ where: { habitId } });
    await prisma.trackedHabit.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
  });

  describe("1. T-12: URGE / RESISTED menambah urgesResisted tanpa mengubah streak", () => {
    it("mencatat dorongan yang berhasil dilawan (RESISTED)", async () => {
      // Periksa streak awal
      const dashBeforeRes = await getDashboardRoute(
        makeRequest(testUserId, `/api/tracked-habits/${habitId}/dashboard`),
        habitContext(habitId),
      );
      const dashBefore = await dashBeforeRes.json();
      const initialStreak = dashBefore.data.stats?.currentStreakDays ?? 0;
      const initialUrges = dashBefore.data.stats?.urgesResisted ?? 0;
      expect(initialStreak).toBe(3);
      expect(initialUrges).toBe(0);

      // Kirim event SOS URGE dengan outcome RESISTED
      const req = makeRequest(testUserId, `/api/tracked-habits/${habitId}/events`, {
        body: {
          type: "URGE",
          intensityBefore: 8,
          intensityAfter: 2,
          outcome: "RESISTED",
          halt: ["HUNGRY", "TIRED"],
          meta: {
            durationSec: 420,
            tools: ["breathing", "coping_plan"],
            copingPlanId,
          },
        },
      });

      const res = await logEventRoute(req, habitContext(habitId));
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.type).toBe("URGE");
      expect(json.data.outcome).toBe("RESISTED");
      expect(json.data.intensityBefore).toBe(8);
      expect(json.data.intensityAfter).toBe(2);

      // Verifikasi stats: urgesResisted naik 1, streak TIDAK BERUBAH (tetap 3)
      const dashAfterRes = await getDashboardRoute(
        makeRequest(testUserId, `/api/tracked-habits/${habitId}/dashboard`),
        habitContext(habitId),
      );
      const dashAfter = await dashAfterRes.json();
      expect(dashAfter.data.stats.urgesResisted).toBe(1);
      expect(dashAfter.data.stats.currentStreakDays).toBe(3); // Streak tetap utuh!
      expect(dashAfter.data.stats.totalLapses).toBe(0);

      // Verifikasi CopingPlan: timesUsed=1, timesHelped=1
      const updatedPlan = await prisma.copingPlan.findUnique({
        where: { id: copingPlanId },
      });
      expect(updatedPlan?.timesUsed).toBe(1);
      expect(updatedPlan?.timesHelped).toBe(1);
    });
  });

  describe("2. Transaksi Atomik: URGE dengan outcome GAVE_IN membuat URGE + LAPSE tertaut", () => {
    it("membuat URGE dan LAPSE dalam satu transaksi tertaut meta.relatedEventId dan mereset streak", async () => {
      const now = new Date();
      // Siapkan jendela checkin aktif yang mencakup now
      const windowStart = new Date(now.getTime() - 2 * 3600 * 1000);
      const windowEnd = new Date(now.getTime() + 22 * 3600 * 1000);
      await prisma.habitCheckin.create({
        data: {
          habitId,
          periodDate: windowEnd,
          windowStart,
          windowEnd,
          status: "PENDING",
        },
      });

      // Kirim event URGE dengan outcome GAVE_IN
      const req = makeRequest(testUserId, `/api/tracked-habits/${habitId}/events`, {
        body: {
          type: "URGE",
          intensityBefore: 9,
          intensityAfter: 9,
          outcome: "GAVE_IN",
          severity: "SLIP",
          halt: ["ANGRY"],
          meta: {
            durationSec: 600,
            tools: ["coping_plan"],
            copingPlanId,
          },
        },
      });

      const res = await logEventRoute(req, habitContext(habitId));
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);

      const urgeEvent = json.data;
      expect(urgeEvent.type).toBe("URGE");
      expect(urgeEvent.outcome).toBe("GAVE_IN");
      expect(urgeEvent.meta.relatedEventId).toBeDefined();

      const relatedLapseId = urgeEvent.meta.relatedEventId;

      // Verifikasi bahwa event LAPSE tertaut dibuat di database
      const lapseEvent = await prisma.habitEvent.findUnique({
        where: { id: relatedLapseId },
      });
      expect(lapseEvent).not.toBeNull();
      expect(lapseEvent?.type).toBe("LAPSE");
      expect(lapseEvent?.severity).toBe("SLIP");
      expect((lapseEvent?.meta as Record<string, unknown>).relatedEventId).toBe(urgeEvent.id);

      // Verifikasi checkin window aktif ditandai LAPSED
      const checkin = await prisma.habitCheckin.findFirst({
        where: {
          habitId,
          windowStart: { lte: now },
          windowEnd: { gt: now },
        },
      });
      expect(checkin?.status).toBe("LAPSED");

      // Verifikasi bahwa streak ter-reset ke 0 karena ada event LAPSE
      const dashRes = await getDashboardRoute(
        makeRequest(testUserId, `/api/tracked-habits/${habitId}/dashboard`),
        habitContext(habitId),
      );
      const dash = await dashRes.json();
      expect(dash.data.stats.currentStreakDays).toBe(0); // Streak reset!
      expect(dash.data.stats.totalLapses).toBe(1);
      expect(dash.data.stats.lastLapseAt).not.toBeNull();

      // Verifikasi CopingPlan: timesUsed naik (2), tapi timesHelped TETAP (1)
      const updatedPlan = await prisma.copingPlan.findUnique({
        where: { id: copingPlanId },
      });
      expect(updatedPlan?.timesUsed).toBe(2);
      expect(updatedPlan?.timesHelped).toBe(1);
    });
  });
});
