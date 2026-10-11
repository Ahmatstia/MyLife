import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/auth";
import { POST as createHabitRoute } from "@/app/api/tracked-habits/route";
import { POST as acknowledgeSafetyRoute } from "@/app/api/tracked-habits/[id]/safety/acknowledge/route";
import { GET as getSupportResourcesRoute } from "@/app/api/support-resources/route";
import { detectCrisisKeywords } from "@/lib/habits/safety/crisis";
import { POST as logEventRoute } from "@/app/api/tracked-habits/[id]/events/route";

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

describe("Safety Screen & Support Resources Integration Tests (Langkah 2.6 - T-19 & §14.3)", () => {
  const testUserId = "user_safety_tester";
  const strangerUserId = "user_safety_stranger";
  let safeHabitId: string;

  beforeAll(async () => {
    // 1. Setup primary user
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        email: "safety_tester@mylife.test",
        name: "Safety Tester",
        passwordHash: "secure_hash",
      },
    });

    // 2. Setup stranger user
    await prisma.user.upsert({
      where: { id: strangerUserId },
      update: {},
      create: {
        id: strangerUserId,
        email: "safety_stranger@mylife.test",
        name: "Safety Stranger",
        passwordHash: "secure_hash",
      },
    });
  });

  afterAll(async () => {
    await prisma.habitEvent.deleteMany({
      where: { user: { id: { in: [testUserId, strangerUserId] } } },
    });
    await prisma.habitCheckin.deleteMany({
      where: { habit: { userId: { in: [testUserId, strangerUserId] } } },
    });
    await prisma.habitBreakProfile.deleteMany({
      where: { habit: { userId: { in: [testUserId, strangerUserId] } } },
    });
    await prisma.habitStats.deleteMany({
      where: { habit: { userId: { in: [testUserId, strangerUserId] } } },
    });
    await prisma.trackedHabit.deleteMany({
      where: { userId: { in: [testUserId, strangerUserId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [testUserId, strangerUserId] } },
    });
  });

  describe("1. Skenario T-19: Proteksi Kategori Berisiko Tinggi", () => {
    it("menolak aktivasi kebiasaan berisiko tinggi tanpa safetyAck / safetyAckAt (T-19)", async () => {
      const createReq = makeRequest(testUserId, "/api/tracked-habits", {
        method: "POST",
        body: {
          name: "Berhenti Alkohol Berat",
          kind: "BREAK",
          mode: "ABSTAIN",
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          whyReasons: ["Kesehatan hati", "Keluarga"],
          highRiskCategory: true,
          // safetyAck tidak disertakan
        },
      });

      const res = await createHabitRoute(createReq);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("SAFETY_ACK_REQUIRED");
      expect(json.error.message).toContain("memerlukan konfirmasi layar keselamatan");
    });

    it("berhasil membuat kebiasaan berisiko tinggi jika safetyAck dikonfirmasi", async () => {
      const createReq = makeRequest(testUserId, "/api/tracked-habits", {
        method: "POST",
        body: {
          name: "Berhenti Alkohol Terkonfirmasi",
          kind: "BREAK",
          mode: "ABSTAIN",
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          whyReasons: ["Kesehatan hati", "Keluarga"],
          highRiskCategory: true,
          safetyAck: true,
        },
      });

      const res = await createHabitRoute(createReq);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("ACTIVE");
      expect(json.data.breakProfile.highRiskCategory).toBe(true);
      expect(json.data.breakProfile.safetyAckAt).toBeDefined();

      safeHabitId = json.data.id;
    });

    it("memungkinkan pengakuan keselamatan via POST /safety/acknowledge", async () => {
      // Buat habit berisiko tinggi langsung di DB dalam status PAUSED tanpa safetyAckAt
      const unAckHabit = await prisma.trackedHabit.create({
        data: {
          userId: testUserId,
          name: "Judi Online Butuh Acknowledge",
          kind: "BREAK",
          mode: "ABSTAIN",
          status: "PAUSED",
          timezone: "Asia/Jakarta",
          checkinLocalTime: "21:00",
          startedAt: new Date(),
          currentWindowStart: new Date(),
          breakProfile: {
            create: {
              whyReasons: ["Keuangan keluarga"],
              highRiskCategory: true,
              safetyAckAt: null,
            },
          },
        },
      });

      // Panggil endpoint acknowledge
      const ackReq = makeRequest(
        testUserId,
        `/api/tracked-habits/${unAckHabit.id}/safety/acknowledge`,
        { method: "POST" },
      );
      const ackRes = await acknowledgeSafetyRoute(ackReq, habitContext(unAckHabit.id));
      const ackJson = await ackRes.json();

      expect(ackRes.status).toBe(200);
      expect(ackJson.success).toBe(true);
      expect(ackJson.data.safetyAckAt).toBeDefined();
      expect(ackJson.data.status).toBe("ACTIVE");

      // Verifikasi di DB
      const dbHabit = await prisma.trackedHabit.findUnique({
        where: { id: unAckHabit.id },
        include: { breakProfile: true },
      });
      expect(dbHabit?.status).toBe("ACTIVE");
      expect(dbHabit?.breakProfile?.safetyAckAt).not.toBeNull();
    });

    it("IDOR: menolak pengakuan layar keselamatan dari pengguna lain", async () => {
      const strangerReq = makeRequest(
        strangerUserId,
        `/api/tracked-habits/${safeHabitId}/safety/acknowledge`,
        { method: "POST" },
      );
      const strangerRes = await acknowledgeSafetyRoute(strangerReq, habitContext(safeHabitId));
      expect(strangerRes.status).toBe(404);
    });
  });

  describe("2. Sumber Bantuan Terverifikasi (Support Resources)", () => {
    it("mengembalikan daftar sumber bantuan terverifikasi dari GET /api/support-resources", async () => {
      const req = makeRequest(null, "/api/support-resources?country=ID");
      const res = await getSupportResourcesRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(4);

      interface ResourceItem {
        category: string;
        contact: string;
        isVerified: boolean;
        verifiedAt: string;
      }

      // Verifikasi entri resmi Indonesia
      const sejiwa = (json.data as ResourceItem[]).find((r) => r.category === "CRISIS");
      expect(sejiwa).toBeDefined();
      expect(sejiwa?.contact).toContain("119");
      expect(sejiwa?.isVerified).toBe(true);
      expect(sejiwa?.verifiedAt).toBeDefined();
    });

    it("mendukung filter per kategori", async () => {
      const req = makeRequest(null, "/api/support-resources?category=SUBSTANCE");
      const res = await getSupportResourcesRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect((json.data as Array<{ category: string }>).every((r) => r.category === "SUBSTANCE")).toBe(true);
    });
  });

  describe("3. Deteksi Kata Kunci Krisis pada Catatan (§14.3)", () => {
    it("mendeteksi kata kunci krisis dengan tepat dan konservatif", () => {
      expect(detectCrisisKeywords("Saya merasa putus asa dan ingin bunuh diri malam ini")).toBe(true);
      expect(detectCrisisKeywords("Rasanya ingin mengakhiri hidup saja")).toBe(true);
      expect(detectCrisisKeywords("Ada dorongan untuk melukai diri sendiri")).toBe(true);
      expect(detectCrisisKeywords("thoughts of suicide")).toBe(true);

      // Teks netral / biasa tidak terdeteksi
      expect(detectCrisisKeywords("Hari ini lelah bekerja dan lapar")).toBe(false);
      expect(detectCrisisKeywords("Terpeleset karena kumpul dengan teman")).toBe(false);
      expect(detectCrisisKeywords("")).toBe(false);
      expect(detectCrisisKeywords(null)).toBe(false);
    });

    it("menandai hasCrisisSignal pada meta event bila catatan mengandung kata kunci krisis", async () => {
      const eventReq = makeRequest(
        testUserId,
        `/api/tracked-habits/${safeHabitId}/events`,
        {
          method: "POST",
          body: {
            type: "LAPSE",
            occurredAt: new Date().toISOString(),
            note: "Kejadian malam ini berat, rasanya ingin mengakhiri hidup",
          },
        },
      );

      const eventRes = await logEventRoute(eventReq, habitContext(safeHabitId));
      const eventJson = await eventRes.json();

      expect(eventRes.status).toBe(201);
      expect(eventJson.success).toBe(true);
      expect(eventJson.data.meta.hasCrisisSignal).toBe(true);
    });
  });
});
