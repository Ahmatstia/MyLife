import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/auth";
import { POST as logEventRoute } from "@/app/api/tracked-habits/[id]/events/route";
import { PATCH as updateEventRoute } from "@/app/api/tracked-habits/[id]/events/[eventId]/route";
import { POST as createCopingPlanRoute } from "@/app/api/tracked-habits/[id]/coping-plans/route";

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
const eventContext = (id: string, eventId: string) => ({ params: Promise.resolve({ id, eventId }) });

describe("Debrief & Situational Reflection Integration Tests (Langkah 2.4)", () => {
  const testUserId = "user_debrief_tester";
  const otherUserId = "user_debrief_stranger";
  let habitId: string;
  let otherHabitId: string;
  let habitTriggerId1: string;
  let habitTriggerId2: string;
  let otherHabitTriggerId: string;

  beforeAll(async () => {
    // 1. Setup primary user
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        email: "debrief_tester@mylife.test",
        name: "Debrief Tester",
        passwordHash: "secure_hash",
      },
    });

    // 2. Setup secondary user
    await prisma.user.upsert({
      where: { id: otherUserId },
      update: {},
      create: {
        id: otherUserId,
        email: "debrief_stranger@mylife.test",
        name: "Debrief Stranger",
        passwordHash: "secure_hash",
      },
    });

    // 3. Create habits
    const habit = await prisma.trackedHabit.create({
      data: {
        userId: testUserId,
        name: "Break Kebiasaan Buruk Debrief Test",
        kind: "BREAK",
        mode: "ABSTAIN",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "21:00",
        startedAt: new Date(),
        currentWindowStart: new Date(),
      },
    });
    habitId = habit.id;

    const otherHabit = await prisma.trackedHabit.create({
      data: {
        userId: otherUserId,
        name: "Kebiasaan Orang Lain",
        kind: "BREAK",
        mode: "ABSTAIN",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "21:00",
        startedAt: new Date(),
        currentWindowStart: new Date(),
      },
    });
    otherHabitId = otherHabit.id;

    // 4. Create base triggers
    const trigStress = await prisma.trigger.create({
      data: { name: "Stres Kerja Uji Debrief", category: "EMOTION" },
    });
    const trigSocial = await prisma.trigger.create({
      data: { name: "Tekanan Teman Sebaya", category: "PERSON" },
    });
    const trigOther = await prisma.trigger.create({
      data: { name: "Pemicu Asing", category: "PLACE" },
    });

    // Link triggers to habits
    const ht1 = await prisma.habitTrigger.create({
      data: { habitId, triggerId: trigStress.id, intensity: 5 },
    });
    habitTriggerId1 = ht1.id;

    const ht2 = await prisma.habitTrigger.create({
      data: { habitId, triggerId: trigSocial.id, intensity: 4 },
    });
    habitTriggerId2 = ht2.id;

    const htOther = await prisma.habitTrigger.create({
      data: { habitId: otherHabitId, triggerId: trigOther.id, intensity: 3 },
    });
    otherHabitTriggerId = htOther.id;
  });

  afterAll(async () => {
    await prisma.habitEventTrigger.deleteMany({
      where: { event: { habitId: { in: [habitId, otherHabitId] } } },
    });
    await prisma.copingPlan.deleteMany({
      where: { habitId: { in: [habitId, otherHabitId] } },
    });
    await prisma.habitEvent.deleteMany({
      where: { habitId: { in: [habitId, otherHabitId] } },
    });
    await prisma.habitTrigger.deleteMany({
      where: { habitId: { in: [habitId, otherHabitId] } },
    });
    await prisma.trackedHabit.deleteMany({
      where: { id: { in: [habitId, otherHabitId] } },
    });
    await prisma.trigger.deleteMany({
      where: {
        name: { in: ["Stres Kerja Uji Debrief", "Tekanan Teman Sebaya", "Pemicu Asing"] },
      },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [testUserId, otherUserId] } },
    });
  });

  it("should successfully record a LAPSE and then update it with 4 debrief answers and linked triggers", async () => {
    // 1. Create LAPSE event
    const createReq = makeRequest(testUserId, `/api/tracked-habits/${habitId}/events`, {
      method: "POST",
      body: {
        type: "LAPSE",
        occurredAt: new Date().toISOString(),
        severity: "SLIP",
        mood: 2,
        note: "Kejadian sore hari setelah rapat",
      },
    });
    const createRes = await logEventRoute(createReq, habitContext(habitId));
    const createJson = await createRes.json();
    expect(createRes.status).toBe(201);
    expect(createJson.success).toBe(true);
    const eventId = createJson.data.id;

    // 2. PATCH event with debrief answers & triggers
    const patchReq = makeRequest(
      testUserId,
      `/api/tracked-habits/${habitId}/events/${eventId}`,
      {
        method: "PATCH",
        body: {
          debriefAnswers: {
            whatHappened: "Rapat kerja dadakan dengan deadline mepet",
            bodyFeeling: "Dada terasa sesak dan gelisah",
            whatHelpedBefore: "Menarik napas panjang 4 hitungan",
            newCopingIdea: "Jika merasa deadline mepet, maka jalan kaki 5 menit ke luar ruangan",
          },
          habitTriggerIds: [habitTriggerId1, habitTriggerId2],
          mood: 3,
          halt: ["ANGRY", "TIRED"],
        },
      },
    );

    const patchRes = await updateEventRoute(
      patchReq,
      eventContext(habitId, eventId),
    );
    const patchJson = await patchRes.json();
    expect(patchRes.status).toBe(200);
    expect(patchJson.success).toBe(true);

    const updatedEvent = patchJson.data;
    expect(updatedEvent.id).toBe(eventId);
    expect(updatedEvent.mood).toBe(3);
    expect(updatedEvent.meta.debrief).toBeDefined();
    expect(updatedEvent.meta.debrief.whatHappened).toBe("Rapat kerja dadakan dengan deadline mepet");
    expect(updatedEvent.meta.debrief.bodyFeeling).toBe("Dada terasa sesak dan gelisah");
    expect(updatedEvent.meta.debrief.whatHelpedBefore).toBe("Menarik napas panjang 4 hitungan");
    expect(updatedEvent.meta.debrief.newCopingIdea).toBe("Jika merasa deadline mepet, maka jalan kaki 5 menit ke luar ruangan");
    expect(updatedEvent.halt).toEqual(["ANGRY", "TIRED"]);

    // Verify HabitEventTrigger links in DB
    const eventTriggers = await prisma.habitEventTrigger.findMany({
      where: { eventId },
    });
    expect(eventTriggers).toHaveLength(2);
    const linkedIds = eventTriggers.map((et) => et.habitTriggerId);
    expect(linkedIds).toContain(habitTriggerId1);
    expect(linkedIds).toContain(habitTriggerId2);
  });

  it("should reject updating an event if habitTriggerId does not belong to the habit", async () => {
    // Create an event
    const createReq = makeRequest(testUserId, `/api/tracked-habits/${habitId}/events`, {
      method: "POST",
      body: {
        type: "LAPSE",
        occurredAt: new Date().toISOString(),
      },
    });
    const createRes = await logEventRoute(createReq, habitContext(habitId));
    const createJson = await createRes.json();
    const eventId = createJson.data.id;

    // Attempt to link a trigger belonging to otherHabitId
    const patchReq = makeRequest(
      testUserId,
      `/api/tracked-habits/${habitId}/events/${eventId}`,
      {
        method: "PATCH",
        body: {
          habitTriggerIds: [otherHabitTriggerId],
        },
      },
    );
    const patchRes = await updateEventRoute(
      patchReq,
      eventContext(habitId, eventId),
    );
    expect(patchRes.status).toBe(400);
    const patchJson = await patchRes.json();
    expect(patchJson.success).toBe(false);
    expect(patchJson.error.message).toContain("tidak valid atau tidak terkait dengan kebiasaan ini");
  });

  it("should enforce IDOR security: forbid other user from updating the event", async () => {
    // Create an event belonging to testUserId
    const createReq = makeRequest(testUserId, `/api/tracked-habits/${habitId}/events`, {
      method: "POST",
      body: {
        type: "LAPSE",
        occurredAt: new Date().toISOString(),
      },
    });
    const createRes = await logEventRoute(createReq, habitContext(habitId));
    const createJson = await createRes.json();
    const eventId = createJson.data.id;

    // Stranger tries to update testUserId's event
    const patchReq = makeRequest(
      otherUserId,
      `/api/tracked-habits/${habitId}/events/${eventId}`,
      {
        method: "PATCH",
        body: {
          debriefAnswers: {
            whatHappened: "Hacking attempt",
          },
        },
      },
    );
    const patchRes = await updateEventRoute(
      patchReq,
      eventContext(habitId, eventId),
    );
    expect(patchRes.status).toBe(404); // Or 403 (habit not found for this user)
  });

  it("should create a CopingPlan directly from question 4 debrief suggestion", async () => {
    const planReq = makeRequest(
      testUserId,
      `/api/tracked-habits/${habitId}/coping-plans`,
      {
        method: "POST",
        body: {
          ifCondition: "merasa deadline mepet",
          thenAction: "jalan kaki 5 menit ke luar ruangan",
          habitTriggerId: habitTriggerId1,
        },
      },
    );
    const planRes = await createCopingPlanRoute(
      planReq,
      habitContext(habitId),
    );
    const planJson = await planRes.json();
    expect(planRes.status).toBe(201);
    expect(planJson.success).toBe(true);
    expect(planJson.data.ifCondition).toBe("merasa deadline mepet");
    expect(planJson.data.thenAction).toBe("jalan kaki 5 menit ke luar ruangan");
    expect(planJson.data.habitTriggerId).toBe(habitTriggerId1);
  });
});
