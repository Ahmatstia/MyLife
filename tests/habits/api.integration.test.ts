import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/auth";

// Route handlers
import {
  GET as listHabitsRoute,
  POST as createHabitRoute,
} from "@/app/api/tracked-habits/route";
import {
  GET as getHabitRoute,
  PATCH as patchHabitRoute,
} from "@/app/api/tracked-habits/[id]/route";
import { POST as pauseHabitRoute } from "@/app/api/tracked-habits/[id]/pause/route";
import { POST as resumeHabitRoute } from "@/app/api/tracked-habits/[id]/resume/route";
import { POST as archiveHabitRoute } from "@/app/api/tracked-habits/[id]/archive/route";
import { GET as getDashboardRoute } from "@/app/api/tracked-habits/[id]/dashboard/route";
import { POST as logEventRoute } from "@/app/api/tracked-habits/[id]/events/route";
import { DELETE as deleteEventRoute } from "@/app/api/tracked-habits/[id]/events/[eventId]/route";
import { GET as getCalendarRoute } from "@/app/api/tracked-habits/[id]/calendar/route";
import { GET as getPendingCheckinsRoute } from "@/app/api/tracked-habits/pending-checkins/route";
import { POST as respondCheckinRoute } from "@/app/api/tracked-habits/[id]/checkins/[checkinId]/respond/route";

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
const eventContext = (id: string, eventId: string) => ({
  params: Promise.resolve({ id, eventId }),
});
const checkinContext = (id: string, checkinId: string) => ({
  params: Promise.resolve({ id, checkinId }),
});

describe("TrackedHabits API Routes Integration Tests", () => {
  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    const uA = await prisma.user.create({
      data: {
        email: `api-test-uA-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
        name: "API Test User A",
      },
    });
    const uB = await prisma.user.create({
      data: {
        email: `api-test-uB-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
        name: "API Test User B",
      },
    });
    userAId = uA.id;
    userBId = uB.id;
  });

  afterAll(async () => {
    if (userAId) await prisma.user.delete({ where: { id: userAId } }).catch(() => {});
    if (userBId) await prisma.user.delete({ where: { id: userBId } }).catch(() => {});
  });

  // 1. Authentication
  describe("Authentication Guard (401)", () => {
    it("rejects unauthenticated requests", async () => {
      const res = await listHabitsRoute(makeRequest(null, "/api/tracked-habits"));
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("UNAUTHENTICATED");
    });

    it("rejects invalid cookie token", async () => {
      const req = new Request("http://localhost/api/tracked-habits", {
        headers: { cookie: "ppos_session=invalid.token.here" },
      });
      const res = await listHabitsRoute(req);
      expect(res.status).toBe(401);
    });
  });

  // 2. Lifecycle & CRUD for TrackedHabit
  describe("CRUD & Lifecycle Endpoints", () => {
    let habitAId: string;

    it("POST /api/tracked-habits - creates a habit successfully (201)", async () => {
      const res = await createHabitRoute(
        makeRequest(userAId, "/api/tracked-habits", {
          body: {
            name: "Quit Vaping",
            displayAlias: "Fresh Air",
            category: "HEALTH",
            kind: "BREAK",
            mode: "ABSTAIN",
            timezone: "Asia/Jakarta",
            checkinLocalTime: "21:00",
            whyReasons: ["Healthier lungs", "Save money"],
            costPerOccurrence: 50000,
          },
        }),
      );

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBeDefined();
      expect(json.data.name).toBe("Quit Vaping");
      expect(json.data.breakProfile).toBeDefined();
      expect(json.data.stats).toBeDefined();

      habitAId = json.data.id;
    });

    it("POST /api/tracked-habits - validates input schema (400)", async () => {
      const res = await createHabitRoute(
        makeRequest(userAId, "/api/tracked-habits", {
          body: {
            name: "", // Invalid empty name
            kind: "BREAK",
            mode: "ABSTAIN",
            timezone: "Asia/Jakarta",
            checkinLocalTime: "25:00", // Invalid hour
            whyReasons: [],
          },
        }),
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("VALIDATION_ERROR");
    });

    it("GET /api/tracked-habits - lists habits for user A (200)", async () => {
      const res = await listHabitsRoute(makeRequest(userAId, "/api/tracked-habits"));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.some((h: { id: string }) => h.id === habitAId)).toBe(true);
    });

    it("GET /api/tracked-habits/[id] - returns habit detail (200)", async () => {
      const res = await getHabitRoute(
        makeRequest(userAId, `/api/tracked-habits/${habitAId}`),
        habitContext(habitAId),
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(habitAId);
    });

    it("PATCH /api/tracked-habits/[id] - updates habit details and recalculates window if checkin time changes (200)", async () => {
      const res = await patchHabitRoute(
        makeRequest(userAId, `/api/tracked-habits/${habitAId}`, {
          method: "PATCH",
          body: {
            name: "Quit Vaping Completely",
            checkinLocalTime: "22:00",
            privacyLevel: 2,
          },
        }),
        habitContext(habitAId),
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("Quit Vaping Completely");
      expect(json.data.checkinLocalTime).toBe("22:00");
      expect(json.data.privacyLevel).toBe(2);
    });

    it("POST /api/tracked-habits/[id]/pause - pauses habit (200)", async () => {
      const res = await pauseHabitRoute(
        makeRequest(userAId, `/api/tracked-habits/${habitAId}/pause`),
        habitContext(habitAId),
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe("PAUSED");
    });

    it("POST /api/tracked-habits/[id]/resume - resumes habit (200)", async () => {
      const res = await resumeHabitRoute(
        makeRequest(userAId, `/api/tracked-habits/${habitAId}/resume`),
        habitContext(habitAId),
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe("ACTIVE");
    });

    it("POST /api/tracked-habits/[id]/archive - archives habit (200)", async () => {
      const res = await archiveHabitRoute(
        makeRequest(userAId, `/api/tracked-habits/${habitAId}/archive`),
        habitContext(habitAId),
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe("ARCHIVED");
      expect(json.data.archivedAt).toBeDefined();

      // Resume back to ACTIVE for subsequent tests
      await resumeHabitRoute(
        makeRequest(userAId, `/api/tracked-habits/${habitAId}/resume`),
        habitContext(habitAId),
      );
    });
  });

  // 3. Events & Idempotency
  describe("Events & Idempotency Endpoints", () => {
    let habitId: string;
    let eventId: string;

    beforeAll(async () => {
      const habit = await prisma.trackedHabit.create({
        data: {
          userId: userAId,
          name: "Habit with Events",
          kind: "BREAK",
          mode: "ABSTAIN",
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          startedAt: new Date("2026-10-01T00:00:00Z"),
          currentWindowStart: new Date("2026-10-01T00:00:00Z"),
          nextCheckinAt: new Date("2026-10-01T13:00:00Z"),
          breakProfile: {
            create: {
              whyReasons: ["Feel better"],
            },
          },
          stats: {
            create: {},
          },
        },
      });
      habitId = habit.id;
    });

    it("POST /api/tracked-habits/[id]/events - logs LAPSE event (201)", async () => {
      const res = await logEventRoute(
        makeRequest(userAId, `/api/tracked-habits/${habitId}/events`, {
          body: {
            type: "LAPSE",
            occurredAt: new Date("2026-10-05T12:00:00Z"),
            quantity: 1,
            severity: "SLIP",
            note: "Had a slip at social event",
          },
        }),
        habitContext(habitId),
      );

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.type).toBe("LAPSE");
      expect(json.data.habitId).toBe(habitId);

      eventId = json.data.id;
    });

    it("POST /api/tracked-habits/[id]/events - handles Idempotency-Key header idempotently (T-13)", async () => {
      const idempotencyKey = `idem-${Date.now()}-${Math.random()}`;
      const payload = {
        type: "LAPSE",
        occurredAt: new Date("2026-10-06T10:00:00Z"),
        quantity: 2,
        severity: "RELAPSE",
      };

      // First call
      const res1 = await logEventRoute(
        makeRequest(userAId, `/api/tracked-habits/${habitId}/events`, {
          body: payload,
          headers: { "Idempotency-Key": idempotencyKey },
        }),
        habitContext(habitId),
      );
      expect(res1.status).toBe(201);
      const json1 = await res1.json();

      // Second call with identical Idempotency-Key
      const res2 = await logEventRoute(
        makeRequest(userAId, `/api/tracked-habits/${habitId}/events`, {
          body: payload,
          headers: { "Idempotency-Key": idempotencyKey },
        }),
        habitContext(habitId),
      );
      expect(res2.status).toBe(201);
      const json2 = await res2.json();

      // Must return identical event id without creating duplicate
      expect(json2.data.id).toBe(json1.data.id);
    });

    it("DELETE /api/tracked-habits/[id]/events/[eventId] - soft deletes event and recomputes (200)", async () => {
      const res = await deleteEventRoute(
        makeRequest(userAId, `/api/tracked-habits/${habitId}/events/${eventId}`, {
          method: "DELETE",
        }),
        eventContext(habitId, eventId),
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.deletedEventId).toBe(eventId);

      // Verify soft deleted in database
      const dbEvent = await prisma.habitEvent.findUnique({ where: { id: eventId } });
      expect(dbEvent?.deletedAt).not.toBeNull();
    });
  });

  // 4. Dashboard & Calendar
  describe("Dashboard & Calendar Endpoints", () => {
    let habitId: string;

    beforeAll(async () => {
      const habit = await prisma.trackedHabit.create({
        data: {
          userId: userAId,
          name: "Dashboard Habit",
          kind: "BREAK",
          mode: "ABSTAIN",
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          startedAt: new Date("2026-10-01T00:00:00Z"),
          currentWindowStart: new Date("2026-10-01T00:00:00Z"),
          nextCheckinAt: new Date("2026-10-01T13:00:00Z"),
          breakProfile: {
            create: { whyReasons: ["Health"] },
          },
          stats: {
            create: { currentStreakDays: 3, longestStreakDays: 5 },
          },
          checkins: {
            create: [
              {
                periodDate: new Date("2026-10-01T00:00:00Z"),
                windowStart: new Date("2026-10-01T00:00:00Z"),
                windowEnd: new Date("2026-10-01T13:00:00Z"),
                status: "CLEAN",
              },
              {
                periodDate: new Date("2026-10-02T00:00:00Z"),
                windowStart: new Date("2026-10-01T13:00:00Z"),
                windowEnd: new Date("2026-10-02T13:00:00Z"),
                status: "LAPSED",
              },
            ],
          },
        },
      });
      habitId = habit.id;
    });

    it("GET /api/tracked-habits/[id]/dashboard - returns dashboard data (200)", async () => {
      const res = await getDashboardRoute(
        makeRequest(userAId, `/api/tracked-habits/${habitId}/dashboard`),
        habitContext(habitId),
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.habit.id).toBe(habitId);
      expect(json.data.stats).toBeDefined();
      expect(json.data.calendar.length).toBeGreaterThanOrEqual(2);
    });

    it("GET /api/tracked-habits/[id]/calendar - returns monthly calendar status (200)", async () => {
      const res = await getCalendarRoute(
        makeRequest(userAId, `/api/tracked-habits/${habitId}/calendar?month=2026-10`),
        habitContext(habitId),
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.month).toBe("2026-10");
      expect(json.data.days).toBeDefined();
      expect(json.data.days["2026-10-01"]).toBe("CLEAN");
      expect(json.data.days["2026-10-02"]).toBe("LAPSED");
    });

    it("GET /api/tracked-habits/[id]/calendar - rejects missing or invalid month (400)", async () => {
      const resMissing = await getCalendarRoute(
        makeRequest(userAId, `/api/tracked-habits/${habitId}/calendar`),
        habitContext(habitId),
      );
      expect(resMissing.status).toBe(400);

      const resInvalid = await getCalendarRoute(
        makeRequest(userAId, `/api/tracked-habits/${habitId}/calendar?month=invalid-date`),
        habitContext(habitId),
      );
      expect(resInvalid.status).toBe(400);
    });
  });

  // 5. Pending Checkins & Respond
  describe("Pending Checkins & Respond Endpoints", () => {
    let habitId: string;
    let pendingCheckinId: string;

    beforeAll(async () => {
      const now = Date.now();
      const windowEnd = new Date(now - 2 * 60 * 60 * 1000);
      const windowStart = new Date(now - 26 * 60 * 60 * 1000);
      const periodDate = new Date(now - 24 * 60 * 60 * 1000);

      const habit = await prisma.trackedHabit.create({
        data: {
          userId: userAId,
          name: "Pending Checkin Habit",
          kind: "BREAK",
          mode: "ABSTAIN",
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          startedAt: windowStart,
          currentWindowStart: windowStart,
          nextCheckinAt: windowEnd,
          breakProfile: {
            create: { whyReasons: ["Consistency"] },
          },
          stats: {
            create: {},
          },
          checkins: {
            create: {
              periodDate,
              windowStart,
              windowEnd,
              status: "PENDING",
            },
          },
        },
        include: { checkins: true },
      });
      habitId = habit.id;
      pendingCheckinId = habit.checkins[0].id;
    });

    it("GET /api/tracked-habits/pending-checkins - lists pending checkins for user (200)", async () => {
      const res = await getPendingCheckinsRoute(
        makeRequest(userAId, "/api/tracked-habits/pending-checkins"),
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.some((c: { id: string }) => c.id === pendingCheckinId)).toBe(true);
    });

    it("POST /api/tracked-habits/[id]/checkins/[checkinId]/respond - responds to checkin (200)", async () => {
      const res = await respondCheckinRoute(
        makeRequest(
          userAId,
          `/api/tracked-habits/${habitId}/checkins/${pendingCheckinId}/respond`,
          {
            body: {
              answer: "CLEAN",
              mood: 5,
              note: "Felt great today",
            },
          },
        ),
        checkinContext(habitId, pendingCheckinId),
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.checkin.status).toBe("CLEAN");
      expect(json.data.stats).toBeDefined();
    });
  });

  // 6. Complete IDOR Isolation Tests (User B attacking User A's resources)
  describe("IDOR Isolation Tests (T-18)", () => {
    let habitAId: string;
    let eventAId: string;
    let checkinAId: string;

    beforeAll(async () => {
      const habitA = await prisma.trackedHabit.create({
        data: {
          userId: userAId,
          name: "User A Confidential Habit",
          kind: "BREAK",
          mode: "ABSTAIN",
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          startedAt: new Date("2026-10-01T00:00:00Z"),
          currentWindowStart: new Date("2026-10-01T00:00:00Z"),
          nextCheckinAt: new Date("2026-10-01T13:00:00Z"),
          breakProfile: {
            create: { whyReasons: ["Personal privacy"] },
          },
          stats: {
            create: {},
          },
          checkins: {
            create: {
              periodDate: new Date("2026-10-01T00:00:00Z"),
              windowStart: new Date("2026-10-01T00:00:00Z"),
              windowEnd: new Date("2026-10-01T13:00:00Z"),
              status: "PENDING",
            },
          },
          events: {
            create: {
              userId: userAId,
              type: "LAPSE",
              occurredAt: new Date("2026-10-01T05:00:00Z"),
              quantity: 1,
            },
          },
        },
        include: { checkins: true, events: true },
      });
      habitAId = habitA.id;
      checkinAId = habitA.checkins[0].id;
      eventAId = habitA.events[0].id;
    });

    it("User B cannot GET User A habit detail (404)", async () => {
      const res = await getHabitRoute(
        makeRequest(userBId, `/api/tracked-habits/${habitAId}`),
        habitContext(habitAId),
      );
      expect(res.status).toBe(404);
    });

    it("User B cannot PATCH User A habit (404)", async () => {
      const res = await patchHabitRoute(
        makeRequest(userBId, `/api/tracked-habits/${habitAId}`, {
          method: "PATCH",
          body: { name: "Hacked Name" },
        }),
        habitContext(habitAId),
      );
      expect(res.status).toBe(404);
    });

    it("User B cannot PAUSE User A habit (404)", async () => {
      const res = await pauseHabitRoute(
        makeRequest(userBId, `/api/tracked-habits/${habitAId}/pause`),
        habitContext(habitAId),
      );
      expect(res.status).toBe(404);
    });

    it("User B cannot RESUME User A habit (404)", async () => {
      const res = await resumeHabitRoute(
        makeRequest(userBId, `/api/tracked-habits/${habitAId}/resume`),
        habitContext(habitAId),
      );
      expect(res.status).toBe(404);
    });

    it("User B cannot ARCHIVE User A habit (404)", async () => {
      const res = await archiveHabitRoute(
        makeRequest(userBId, `/api/tracked-habits/${habitAId}/archive`),
        habitContext(habitAId),
      );
      expect(res.status).toBe(404);
    });

    it("User B cannot GET User A habit dashboard (404)", async () => {
      const res = await getDashboardRoute(
        makeRequest(userBId, `/api/tracked-habits/${habitAId}/dashboard`),
        habitContext(habitAId),
      );
      expect(res.status).toBe(404);
    });

    it("User B cannot POST event to User A habit (404)", async () => {
      const res = await logEventRoute(
        makeRequest(userBId, `/api/tracked-habits/${habitAId}/events`, {
          body: {
            type: "LAPSE",
            occurredAt: new Date("2026-10-01T08:00:00Z"),
          },
        }),
        habitContext(habitAId),
      );
      expect(res.status).toBe(404);
    });

    it("User B cannot DELETE event belonging to User A habit (404)", async () => {
      const res = await deleteEventRoute(
        makeRequest(userBId, `/api/tracked-habits/${habitAId}/events/${eventAId}`, {
          method: "DELETE",
        }),
        eventContext(habitAId, eventAId),
      );
      expect(res.status).toBe(404);
    });

    it("User B cannot GET User A habit calendar (404)", async () => {
      const res = await getCalendarRoute(
        makeRequest(userBId, `/api/tracked-habits/${habitAId}/calendar?month=2026-10`),
        habitContext(habitAId),
      );
      expect(res.status).toBe(404);
    });

    it("User B cannot respond to User A checkin (404)", async () => {
      const res = await respondCheckinRoute(
        makeRequest(
          userBId,
          `/api/tracked-habits/${habitAId}/checkins/${checkinAId}/respond`,
          {
            body: { response: "CLEAN" },
          },
        ),
        checkinContext(habitAId, checkinAId),
      );
      expect(res.status).toBe(404);
    });

    it("User B's habit list does not contain User A habits", async () => {
      const res = await listHabitsRoute(makeRequest(userBId, "/api/tracked-habits"));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.some((h: { id: string }) => h.id === habitAId)).toBe(false);
    });

    it("User B's pending checkins does not contain User A checkins", async () => {
      const res = await getPendingCheckinsRoute(
        makeRequest(userBId, "/api/tracked-habits/pending-checkins"),
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.some((c: { id: string }) => c.id === checkinAId)).toBe(false);
    });
  });
});
