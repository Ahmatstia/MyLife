import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/auth";
import { seedBuiltinTriggers } from "@/lib/habits/triggers/library";

// Route handlers
import { GET as getLibraryRoute } from "@/app/api/tracked-habits/triggers/library/route";
import {
  GET as getHabitTriggersRoute,
  POST as attachHabitTriggerRoute,
} from "@/app/api/tracked-habits/[id]/triggers/route";
import {
  PATCH as updateHabitTriggerRoute,
  DELETE as deleteHabitTriggerRoute,
} from "@/app/api/tracked-habits/[id]/triggers/[habitTriggerId]/route";
import {
  GET as getCopingPlansRoute,
  POST as createCopingPlanRoute,
} from "@/app/api/tracked-habits/[id]/coping-plans/route";
import {
  PATCH as updateCopingPlanRoute,
  DELETE as deleteCopingPlanRoute,
} from "@/app/api/tracked-habits/[id]/coping-plans/[planId]/route";
import { POST as recordOutcomeRoute } from "@/app/api/tracked-habits/[id]/coping-plans/[planId]/outcome/route";

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
const habitTriggerContext = (id: string, habitTriggerId: string) => ({
  params: Promise.resolve({ id, habitTriggerId }),
});
const copingPlanContext = (id: string, planId: string) => ({
  params: Promise.resolve({ id, planId }),
});

describe("Triggers & Coping Plans Integration Tests (Langkah 2.2)", () => {
  const userA = "user_cp_test_alice";
  const userB = "user_cp_test_bob";
  let habitAId: string;
  let habitBId: string;

  beforeAll(async () => {
    // Siapkan pemicu bawaan
    await seedBuiltinTriggers(prisma);

    // Siapkan 2 pengguna untuk uji IDOR
    await prisma.user.upsert({
      where: { id: userA },
      update: {},
      create: {
        id: userA,
        email: "alice_cp@mylife.test",
        name: "Alice Coping",
        passwordHash: "secure_hash_alice",
      },
    });

    await prisma.user.upsert({
      where: { id: userB },
      update: {},
      create: {
        id: userB,
        email: "bob_cp@mylife.test",
        name: "Bob Coping",
        passwordHash: "secure_hash_bob",
      },
    });

    // Buat kebiasaan Alice
    const habitA = await prisma.trackedHabit.create({
      data: {
        userId: userA,
        name: "Kebiasaan Alice",
        kind: "BREAK",
        mode: "ABSTAIN",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "20:00",
        startedAt: new Date(),
        currentWindowStart: new Date(),
      },
    });
    habitAId = habitA.id;

    // Buat kebiasaan Bob
    const habitB = await prisma.trackedHabit.create({
      data: {
        userId: userB,
        name: "Kebiasaan Bob",
        kind: "BREAK",
        mode: "ABSTAIN",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "21:00",
        startedAt: new Date(),
        currentWindowStart: new Date(),
      },
    });
    habitBId = habitB.id;
  });

  afterAll(async () => {
    await prisma.copingPlan.deleteMany({
      where: { habitId: { in: [habitAId, habitBId] } },
    });
    await prisma.habitTrigger.deleteMany({
      where: { habitId: { in: [habitAId, habitBId] } },
    });
    await prisma.trackedHabit.deleteMany({
      where: { userId: { in: [userA, userB] } },
    });
    await prisma.trigger.deleteMany({
      where: { userId: { in: [userA, userB] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userA, userB] } },
    });
  });

  describe("1. Library Triggers API", () => {
    it("GET /triggers/library mengembalikan daftar pemicu bawaan global", async () => {
      const req = makeRequest(userA, "/api/tracked-habits/triggers/library");
      const res = await getLibraryRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(27);

      // Semua pemicu bawaan memiliki userId null
      for (const t of json.data) {
        expect(t.userId).toBeNull();
      }
    });

    it("GET /triggers/library?category=PHYSICAL memfilter berdasarkan kategori", async () => {
      const req = makeRequest(userA, "/api/tracked-habits/triggers/library?category=PHYSICAL");
      const res = await getLibraryRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.length).toBeGreaterThanOrEqual(4);
      expect(json.data.every((t: { category: string }) => t.category === "PHYSICAL")).toBe(true);
    });
  });

  describe("2. Habit Triggers CRUD & IDOR", () => {
    let attachedHtId: string;
    let customTriggerId: string;

    it("menghubungkan pemicu bawaan ke kebiasaan dengan intensitas dan catatan", async () => {
      const builtin = await prisma.trigger.findFirst({
        where: { userId: null, name: "Bosan / Kurang Stimulasi (HALT+B: Bored)" },
      });
      expect(builtin).toBeTruthy();

      const req = makeRequest(userA, `/api/tracked-habits/${habitAId}/triggers`, {
        body: {
          triggerId: builtin!.id,
          intensity: 4,
          note: "Sering muncul sore hari setelah jam kerja",
        },
      });
      const res = await attachHabitTriggerRoute(req, habitContext(habitAId));
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.habitId).toBe(habitAId);
      expect(json.data.triggerId).toBe(builtin!.id);
      expect(json.data.intensity).toBe(4);
      expect(json.data.note).toBe("Sering muncul sore hari setelah jam kerja");
      attachedHtId = json.data.id;
    });

    it("menolak duplikasi pemicu yang sama pada kebiasaan yang sama (409 CONFLICT)", async () => {
      const builtin = await prisma.trigger.findFirst({
        where: { userId: null, name: "Bosan / Kurang Stimulasi (HALT+B: Bored)" },
      });

      const req = makeRequest(userA, `/api/tracked-habits/${habitAId}/triggers`, {
        body: {
          triggerId: builtin!.id,
          intensity: 2,
        },
      });
      const res = await attachHabitTriggerRoute(req, habitContext(habitAId));
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("CONFLICT");
    });

    it("bisa membuat pemicu kustom baru sekaligus menghubungkannya", async () => {
      const req = makeRequest(userA, `/api/tracked-habits/${habitAId}/triggers`, {
        body: {
          custom: {
            name: "Melihat Kafe Tertentu",
            category: "PLACE",
            description: "Kafe dekat kantor tempat biasa merokok",
          },
          intensity: 5,
          note: "Sangat kuat godaannya saat lewat sana",
        },
      });
      const res = await attachHabitTriggerRoute(req, habitContext(habitAId));
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.intensity).toBe(5);
      expect(json.data.trigger.name).toBe("Melihat Kafe Tertentu");
      expect(json.data.trigger.userId).toBe(userA);
      customTriggerId = json.data.trigger.id;
    });

    it("IDOR: user B tidak bisa menggunakan pemicu kustom milik user A", async () => {
      const req = makeRequest(userB, `/api/tracked-habits/${habitBId}/triggers`, {
        body: {
          triggerId: customTriggerId,
          intensity: 3,
        },
      });
      const res = await attachHabitTriggerRoute(req, habitContext(habitBId));
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
    });

    it("IDOR: user B tidak bisa menghubungkan pemicu ke kebiasaan milik user A", async () => {
      const builtin = await prisma.trigger.findFirst({
        where: { userId: null, name: "Lelah / Kurang Tidur (HALT: Tired)" },
      });

      const req = makeRequest(userB, `/api/tracked-habits/${habitAId}/triggers`, {
        body: {
          triggerId: builtin!.id,
          intensity: 3,
        },
      });
      const res = await attachHabitTriggerRoute(req, habitContext(habitAId));
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
    });

    it("GET /triggers mengembalikan daftar pemicu terhubung", async () => {
      const req = makeRequest(userA, `/api/tracked-habits/${habitAId}/triggers`);
      const res = await getHabitTriggersRoute(req, habitContext(habitAId));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.length).toBe(2);
      // Diurutkan berdasarkan intensitas desc (5, lalu 4)
      expect(json.data[0].intensity).toBe(5);
      expect(json.data[1].intensity).toBe(4);
    });

    it("PATCH /triggers/[habitTriggerId] memperbarui intensitas dan catatan", async () => {
      const req = makeRequest(
        userA,
        `/api/tracked-habits/${habitAId}/triggers/${attachedHtId}`,
        {
          method: "PATCH",
          body: {
            intensity: 2,
            note: "Intensitas sudah menurun",
          },
        },
      );
      const res = await updateHabitTriggerRoute(
        req,
        habitTriggerContext(habitAId, attachedHtId),
      );
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.intensity).toBe(2);
      expect(json.data.note).toBe("Intensitas sudah menurun");
    });

    it("IDOR: user B tidak bisa memperbarui habitTrigger milik user A", async () => {
      const req = makeRequest(
        userB,
        `/api/tracked-habits/${habitAId}/triggers/${attachedHtId}`,
        {
          method: "PATCH",
          body: { intensity: 1 },
        },
      );
      const res = await updateHabitTriggerRoute(
        req,
        habitTriggerContext(habitAId, attachedHtId),
      );
      expect(res.status).toBe(404);
    });

    it("DELETE /triggers/[habitTriggerId] menghapus pemicu dari kebiasaan", async () => {
      const req = makeRequest(
        userA,
        `/api/tracked-habits/${habitAId}/triggers/${attachedHtId}`,
        { method: "DELETE" },
      );
      const res = await deleteHabitTriggerRoute(
        req,
        habitTriggerContext(habitAId, attachedHtId),
      );
      expect(res.status).toBe(200);

      // Verifikasi sudah terhapus
      const check = await prisma.habitTrigger.findUnique({
        where: { id: attachedHtId },
      });
      expect(check).toBeNull();
    });
  });

  describe("3. Coping Plans CRUD & IDOR", () => {
    let aliceHabitTriggerId: string;
    let bobHabitTriggerId: string;
    let createdPlanId: string;

    beforeAll(async () => {
      // Siapkan HabitTrigger untuk Alice
      const triggerA = await prisma.trigger.findFirst({
        where: { userId: null, name: "Kesepian / Terisolasi (HALT: Lonely)" },
      });
      const htA = await prisma.habitTrigger.create({
        data: {
          habitId: habitAId,
          triggerId: triggerA!.id,
          intensity: 4,
        },
      });
      aliceHabitTriggerId = htA.id;

      // Siapkan HabitTrigger untuk Bob
      const triggerB = await prisma.trigger.findFirst({
        where: { userId: null, name: "Marah / Frustrasi (HALT: Angry)" },
      });
      const htB = await prisma.habitTrigger.create({
        data: {
          habitId: habitBId,
          triggerId: triggerB!.id,
          intensity: 3,
        },
      });
      bobHabitTriggerId = htB.id;
    });

    it("POST /coping-plans membuat rencana jika-maka tertaut ke HabitTrigger", async () => {
      const req = makeRequest(userA, `/api/tracked-habits/${habitAId}/coping-plans`, {
        body: {
          habitTriggerId: aliceHabitTriggerId,
          ifCondition: "Jika merasa kesepian di malam hari",
          thenAction: "Maka saya akan menelepon teman atau membaca buku 15 menit",
          order: 1,
        },
      });
      const res = await createCopingPlanRoute(req, habitContext(habitAId));
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.habitId).toBe(habitAId);
      expect(json.data.habitTriggerId).toBe(aliceHabitTriggerId);
      expect(json.data.ifCondition).toBe("Jika merasa kesepian di malam hari");
      expect(json.data.thenAction).toBe("Maka saya akan menelepon teman atau membaca buku 15 menit");
      expect(json.data.timesUsed).toBe(0);
      expect(json.data.timesHelped).toBe(0);
      createdPlanId = json.data.id;
    });

    it("VALIDASI: Menolak CopingPlan yang merujuk HabitTrigger milik kebiasaan lain", async () => {
      const req = makeRequest(userA, `/api/tracked-habits/${habitAId}/coping-plans`, {
        body: {
          habitTriggerId: bobHabitTriggerId, // Milik habit Bob!
          ifCondition: "Jika dorongan muncul",
          thenAction: "Maka minum segelas air",
        },
      });
      const res = await createCopingPlanRoute(req, habitContext(habitAId));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error.message).toContain("tidak valid");
    });

    it("IDOR: user B tidak bisa membuat rencana jika-maka untuk habit milik user A", async () => {
      const req = makeRequest(userB, `/api/tracked-habits/${habitAId}/coping-plans`, {
        body: {
          ifCondition: "Jika tergoda",
          thenAction: "Maka jalan-jalan",
        },
      });
      const res = await createCopingPlanRoute(req, habitContext(habitAId));
      expect(res.status).toBe(404);
    });

    it("GET /coping-plans mengembalikan daftar rencana jika-maka milik habit", async () => {
      const req = makeRequest(userA, `/api/tracked-habits/${habitAId}/coping-plans`);
      const res = await getCopingPlansRoute(req, habitContext(habitAId));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.length).toBe(1);
      expect(json.data[0].id).toBe(createdPlanId);
      expect(json.data[0].habitTrigger.id).toBe(aliceHabitTriggerId);
    });

    it("PATCH /coping-plans/[planId] memperbarui aksi rencana", async () => {
      const req = makeRequest(
        userA,
        `/api/tracked-habits/${habitAId}/coping-plans/${createdPlanId}`,
        {
          method: "PATCH",
          body: {
            thenAction: "Maka saya akan mendengarkan musik santai atau journaling",
          },
        },
      );
      const res = await updateCopingPlanRoute(
        req,
        copingPlanContext(habitAId, createdPlanId),
      );
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.thenAction).toBe("Maka saya akan mendengarkan musik santai atau journaling");
    });

    it("IDOR: user B tidak bisa mengubah rencana milik user A", async () => {
      const req = makeRequest(
        userB,
        `/api/tracked-habits/${habitAId}/coping-plans/${createdPlanId}`,
        {
          method: "PATCH",
          body: { thenAction: "Hack" },
        },
      );
      const res = await updateCopingPlanRoute(
        req,
        copingPlanContext(habitAId, createdPlanId),
      );
      expect(res.status).toBe(404);
    });
  });

  describe("4. Coping Plan Outcome Tracking & Invariants", () => {
    let testPlanId: string;

    beforeAll(async () => {
      const plan = await prisma.copingPlan.create({
        data: {
          habitId: habitAId,
          ifCondition: "Jika stres pekerjaan",
          thenAction: "Tarik napas dalam 4-7-8 selama 3 siklus",
          timesUsed: 0,
          timesHelped: 0,
        },
      });
      testPlanId = plan.id;
    });

    it("mencatat outcome pertama: berhasil membantu (helped: true) -> used=1, helped=1", async () => {
      const req = makeRequest(
        userA,
        `/api/tracked-habits/${habitAId}/coping-plans/${testPlanId}/outcome`,
        {
          body: { helped: true },
        },
      );
      const res = await recordOutcomeRoute(
        req,
        copingPlanContext(habitAId, testPlanId),
      );
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.timesUsed).toBe(1);
      expect(json.data.timesHelped).toBe(1);
    });

    it("mencatat outcome kedua: tidak membantu (helped: false) -> used=2, helped=1", async () => {
      const req = makeRequest(
        userA,
        `/api/tracked-habits/${habitAId}/coping-plans/${testPlanId}/outcome`,
        {
          body: { helped: false },
        },
      );
      const res = await recordOutcomeRoute(
        req,
        copingPlanContext(habitAId, testPlanId),
      );
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.timesUsed).toBe(2);
      expect(json.data.timesHelped).toBe(1);
    });

    it("mencatat outcome ketiga: membantu lagi (helped: true) -> used=3, helped=2", async () => {
      const req = makeRequest(
        userA,
        `/api/tracked-habits/${habitAId}/coping-plans/${testPlanId}/outcome`,
        {
          body: { helped: true },
        },
      );
      const res = await recordOutcomeRoute(
        req,
        copingPlanContext(habitAId, testPlanId),
      );
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.timesUsed).toBe(3);
      expect(json.data.timesHelped).toBe(2);
    });

    it("IDOR: user B tidak bisa mencatat outcome untuk rencana user A", async () => {
      const req = makeRequest(
        userB,
        `/api/tracked-habits/${habitAId}/coping-plans/${testPlanId}/outcome`,
        {
          body: { helped: true },
        },
      );
      const res = await recordOutcomeRoute(
        req,
        copingPlanContext(habitAId, testPlanId),
      );
      expect(res.status).toBe(404);
    });

    it("DELETE /coping-plans/[planId] menghapus rencana", async () => {
      const req = makeRequest(
        userA,
        `/api/tracked-habits/${habitAId}/coping-plans/${testPlanId}`,
        { method: "DELETE" },
      );
      const res = await deleteCopingPlanRoute(
        req,
        copingPlanContext(habitAId, testPlanId),
      );
      expect(res.status).toBe(200);

      const check = await prisma.copingPlan.findUnique({
        where: { id: testPlanId },
      });
      expect(check).toBeNull();
    });
  });
});
