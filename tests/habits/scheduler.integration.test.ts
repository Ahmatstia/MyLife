import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { FakeClock } from "@/lib/habits/clock";
import {
  tickHabitsScheduler,
  buildCheckinNotificationPayload,
} from "@/services/habits/scheduler.service";
import { updateTrackedHabitService } from "@/services/habits/habit-v2.service";
import { GET as reminderCronRoute } from "@/app/api/cron/reminder/route";

describe("Habits v2 Scheduler Integration Tests (Langkah 1.5)", () => {
  let user1Id: string;
  let user2Id: string;

  beforeAll(async () => {
    const u1 = await prisma.user.create({
      data: {
        email: `sched-u1-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
        name: "Scheduler Test User 1",
        preference: {
          create: {
            timezone: "Asia/Jakarta",
            enableNotifications: true,
          },
        },
      },
    });
    const u2 = await prisma.user.create({
      data: {
        email: `sched-u2-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
        name: "Scheduler Test User 2",
        preference: {
          create: {
            timezone: "Asia/Jakarta",
            enableNotifications: true,
          },
        },
      },
    });
    user1Id = u1.id;
    user2Id = u2.id;
  });

  afterAll(async () => {
    if (user1Id) await prisma.user.delete({ where: { id: user1Id } }).catch(() => {});
    if (user2Id) await prisma.user.delete({ where: { id: user2Id } }).catch(() => {});
  });

  // T-01: Check-in 06:00, tick berjalan 06:00:30 -> 1 check-in PENDING, 1 notifikasi
  it("T-01: Check-in 06:00, tick berjalan 06:00:30 -> 1 check-in PENDING, 1 notifikasi", async () => {
    // 06:00 WIB (Asia/Jakarta, UTC+7) pada 2026-10-01 adalah 2026-09-30T23:00:00Z
    const startedAt = new Date("2026-09-30T17:00:00.000Z"); // 00:00 WIB
    const nextCheckinAt = new Date("2026-09-30T23:00:00.000Z"); // 06:00 WIB

    const habit = await prisma.trackedHabit.create({
      data: {
        userId: user1Id,
        name: "T01 Early Morning Checkin",
        kind: "BREAK",
        mode: "ABSTAIN",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "06:00",
        startedAt,
        currentWindowStart: startedAt,
        nextCheckinAt,
        breakProfile: {
          create: { whyReasons: ["Wake up early"] },
        },
        stats: {
          create: {},
        },
      },
    });

    // Tick berjalan pada 06:00:30 WIB (2026-09-30T23:00:30Z)
    const clock = new FakeClock(new Date("2026-09-30T23:00:30.000Z"));
    const result = await tickHabitsScheduler(clock);

    expect(result.dueHabitsCount).toBeGreaterThanOrEqual(1);

    // Cek check-in dibuat
    const checkins = await prisma.habitCheckin.findMany({
      where: { habitId: habit.id },
    });
    expect(checkins).toHaveLength(1);
    expect(checkins[0].status).toBe("PENDING");

    // Cek outbox dibuat
    const outbox = await prisma.habitNotificationOutbox.findMany({
      where: { habitId: habit.id },
    });
    expect(outbox).toHaveLength(1);
    expect(outbox[0].kind).toBe("HABIT_CHECKIN");
    expect(outbox[0].status).toBe("SENT");

    // Cek habit nextCheckinAt dimajukan ke 06:00 WIB hari berikutnya (2026-10-01T23:00:00Z)
    const updatedHabit = await prisma.trackedHabit.findUnique({
      where: { id: habit.id },
    });
    expect(updatedHabit?.nextCheckinAt?.toISOString()).toBe("2026-10-01T23:00:00.000Z");
  });

  // T-02: Tick dijalankan 2x pada menit yang sama / 2 worker paralel -> Tetap 1 check-in & 1 notifikasi
  it("T-02: Tick dijalankan 2x pada menit yang sama / worker paralel -> Tetap 1 check-in dan 1 notifikasi", async () => {
    const startedAt = new Date("2026-10-01T13:00:00.000Z"); // 20:00 WIB 1 Okt
    const nextCheckinAt = new Date("2026-10-02T13:00:00.000Z"); // 20:00 WIB 2 Okt

    const habit = await prisma.trackedHabit.create({
      data: {
        userId: user1Id,
        name: "T02 Parallel Worker Idempotency",
        kind: "BREAK",
        mode: "ABSTAIN",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "20:00",
        startedAt,
        currentWindowStart: startedAt,
        nextCheckinAt,
        breakProfile: {
          create: { whyReasons: ["Prevent duplicates"] },
        },
        stats: {
          create: {},
        },
      },
    });

    const clock = new FakeClock(new Date("2026-10-02T13:00:15.000Z"));

    // Jalankan 2 tick secara konkuren (simulasi 2 worker paralel)
    await Promise.all([
      tickHabitsScheduler(clock),
      tickHabitsScheduler(clock),
    ]);

    // Jalankan sekali lagi berurutan
    await tickHabitsScheduler(clock);

    // Verifikasi check-in dan outbox tetap tepat 1
    const checkins = await prisma.habitCheckin.findMany({
      where: { habitId: habit.id },
    });
    expect(checkins).toHaveLength(1);

    const outbox = await prisma.habitNotificationOutbox.findMany({
      where: { habitId: habit.id },
    });
    expect(outbox).toHaveLength(1);
  });

  // T-03: Catch-up (Server mati 3 hari, lalu hidup -> 3 jendela dibuat, hanya yang terbaru dinotifikasi)
  it("T-03: Server mati 3 hari -> 3 jendela dibuat; hanya yang terbaru dinotifikasi", async () => {
    // Mulai 1 Okt 20:00 WIB (13:00 UTC)
    const startedAt = new Date("2026-10-01T13:00:00.000Z");
    const nextCheckinAt = new Date("2026-10-02T13:00:00.000Z");

    const habit = await prisma.trackedHabit.create({
      data: {
        userId: user1Id,
        name: "T03 Catchup Offline Habit",
        kind: "BREAK",
        mode: "ABSTAIN",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "20:00",
        startedAt,
        currentWindowStart: startedAt,
        nextCheckinAt,
        breakProfile: {
          create: { whyReasons: ["Catchup test"] },
        },
        stats: {
          create: {},
        },
      },
    });

    // Server mati 3 hari, hidup kembali pada 5 Okt 20:05 WIB (13:05 UTC)
    // Jendela yang jatuh tempo:
    // 1. 2 Okt 20:00 (13:00 UTC)
    // 2. 3 Okt 20:00 (13:00 UTC)
    // 3. 4 Okt 20:00 (13:00 UTC)
    // 4. 5 Okt 20:00 (13:00 UTC)
    const clock = new FakeClock(new Date("2026-10-05T13:05:00.000Z"));
    await tickHabitsScheduler(clock);

    const checkins = await prisma.habitCheckin.findMany({
      where: { habitId: habit.id },
      orderBy: { windowEnd: "asc" },
    });

    // Harus membuat semua jendela catch-up yang lewat (4 jendela: 2, 3, 4, 5 Okt)
    expect(checkins.length).toBe(4);

    // Outbox HANYA berisi 1 notifikasi untuk jendela TERBARU!
    const outbox = await prisma.habitNotificationOutbox.findMany({
      where: { habitId: habit.id },
    });
    expect(outbox).toHaveLength(1);
    expect(outbox[0].scheduledAt.toISOString()).toBe("2026-10-05T13:00:00.000Z");
  });

  // T-04: Pengguna berpindah zona waktu (Asia/Jakarta -> Asia/Makassar)
  it("T-04: Pengguna di Asia/Jakarta pindah ke Asia/Makassar -> jendela berikutnya mengikuti zona baru", async () => {
    // 1 Okt 20:00 WIB (13:00 UTC)
    const startedAt = new Date("2026-10-01T13:00:00.000Z");
    const nextCheckinAt = new Date("2026-10-02T13:00:00.000Z");

    const habit = await prisma.trackedHabit.create({
      data: {
        userId: user1Id,
        name: "T04 Timezone Relocation",
        kind: "BREAK",
        mode: "ABSTAIN",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "20:00",
        startedAt,
        currentWindowStart: startedAt,
        nextCheckinAt,
        breakProfile: {
          create: { whyReasons: ["Travel"] },
        },
        stats: {
          create: {},
        },
      },
    });

    // Selesaikan checkin pertama di Jakarta
    const clock1 = new FakeClock(new Date("2026-10-02T13:01:00.000Z"));
    await tickHabitsScheduler(clock1);

    // Pengguna pindah ke Asia/Makassar (WITA, UTC+8)
    // Jam 20:00 WITA adalah 12:00 UTC (1 jam lebih cepat daripada WIB)
    await updateTrackedHabitService(
      user1Id,
      habit.id,
      { timezone: "Asia/Makassar" },
      clock1,
    );

    // Tick berjalan di hari berikutnya pada 20:01 WITA (12:01 UTC)
    const clock2 = new FakeClock(new Date("2026-10-03T12:01:00.000Z"));
    await tickHabitsScheduler(clock2);

    const checkins = await prisma.habitCheckin.findMany({
      where: { habitId: habit.id },
      orderBy: { windowEnd: "asc" },
    });
    expect(checkins).toHaveLength(2);
  });

  // T-05: DST (Zona waktu New York dengan daylight saving)
  it("T-05: Zona dengan DST -> nextCheckinAt valid tanpa loncat/duplikat", async () => {
    // New York (America/New_York) pada masa pergantian waktu
    const startedAt = new Date("2026-11-01T00:00:00.000Z");
    const nextCheckinAt = new Date("2026-11-01T13:00:00.000Z");

    const habit = await prisma.trackedHabit.create({
      data: {
        userId: user1Id,
        name: "T05 DST America/New_York",
        kind: "BREAK",
        mode: "ABSTAIN",
        timezone: "America/New_York",
        checkinLocalTime: "08:00",
        startedAt,
        currentWindowStart: startedAt,
        nextCheckinAt,
        breakProfile: {
          create: { whyReasons: ["DST test"] },
        },
        stats: {
          create: {},
        },
      },
    });

    const clock = new FakeClock(new Date("2026-11-01T13:05:00.000Z"));
    await tickHabitsScheduler(clock);

    const checkins = await prisma.habitCheckin.findMany({
      where: { habitId: habit.id },
    });
    expect(checkins).toHaveLength(1);
    expect(checkins[0].status).toBe("PENDING");
  });

  // T-06: Terpeleset pukul 23:40, check-in 06:00 -> Check-in LAPSED otomatis; streak 0; last_lapse_at benar
  it("T-06: Terpeleset pukul 23:40, check-in 06:00 -> Check-in LAPSED otomatis, streak 0", async () => {
    // Window: 2026-10-01 06:00 WIB (Sep 30 23:00 UTC) s.d. 2026-10-02 06:00 WIB (Oct 1 23:00 UTC)
    const windowStart = new Date("2026-09-30T23:00:00.000Z");
    const windowEnd = new Date("2026-10-01T23:00:00.000Z");

    const habit = await prisma.trackedHabit.create({
      data: {
        userId: user1Id,
        name: "T06 Auto Lapse On Slip",
        kind: "BREAK",
        mode: "ABSTAIN",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "06:00",
        startedAt: windowStart,
        currentWindowStart: windowStart,
        nextCheckinAt: windowEnd,
        breakProfile: {
          create: { whyReasons: ["No slip"] },
        },
        stats: {
          create: {},
        },
      },
    });

    // 2 checkin CLEAN sebelumnya
    await prisma.habitCheckin.createMany({
      data: [
        {
          habitId: habit.id,
          windowStart: new Date("2026-09-28T23:00:00.000Z"),
          windowEnd: new Date("2026-09-29T23:00:00.000Z"),
          periodDate: new Date("2026-09-29"),
          status: "CLEAN",
        },
        {
          habitId: habit.id,
          windowStart: new Date("2026-09-29T23:00:00.000Z"),
          windowEnd: new Date("2026-09-30T23:00:00.000Z"),
          periodDate: new Date("2026-09-30"),
          status: "CLEAN",
        },
      ],
    });

    // Terpeleset pada 23:40 WIB 1 Okt (16:40 UTC 1 Okt) -> berada di dalam jendela [windowStart, windowEnd)
    const lapseTime = new Date("2026-10-01T16:40:00.000Z");
    await prisma.habitEvent.create({
      data: {
        userId: user1Id,
        habitId: habit.id,
        type: "LAPSE",
        occurredAt: lapseTime,
        quantity: 1,
        severity: "SLIP",
      },
    });

    // Tick berjalan pada 06:00:30 WIB 2 Okt (23:00:30 UTC 1 Okt)
    const clock = new FakeClock(new Date("2026-10-01T23:00:30.000Z"));
    await tickHabitsScheduler(clock);

    // Check-in harus berstatus LAPSED otomatis (initialStatus mendeteksi event LAPSE)
    const checkin = await prisma.habitCheckin.findFirst({
      where: { habitId: habit.id, windowEnd },
    });
    expect(checkin?.status).toBe("LAPSED");

    // Streak harus 0 dan lastLapseAt tercatat, longestStreakDays tetap 2
    const stats = await prisma.habitStats.findUnique({
      where: { habitId: habit.id },
    });
    expect(stats?.currentStreakDays).toBe(0);
    expect(stats?.longestStreakDays).toBe(2);
    expect(stats?.lastLapseAt?.toISOString()).toBe(lapseTime.toISOString());
  });

  // T-20: Mode notifikasi netral (privacyLevel >= 1 tidak membocorkan nama kebiasaan)
  it("T-20: Mode notifikasi netral (privacyLevel 1 & 2) tidak membocorkan nama kebiasaan", async () => {
    const rawHabit = {
      id: "habit-privacy-1",
      name: "Merokok / Vaping Rahasia",
      displayAlias: "Aroma Terapi",
      privacyLevel: 1,
    };

    // Level 1: Teks netral tanpa nama kebiasaan
    const payloadLevel1 = buildCheckinNotificationPayload(rawHabit, "2026-10-10");
    expect(payloadLevel1.title).not.toContain("Merokok");
    expect(payloadLevel1.title).not.toContain("Vaping");
    expect(payloadLevel1.message).not.toContain("Merokok");
    expect(payloadLevel1.message).not.toContain("Vaping");
    expect(payloadLevel1.title).toBe("Waktunya Check-in Harian");

    // Level 2: Menggunakan displayAlias
    const payloadLevel2 = buildCheckinNotificationPayload(
      { ...rawHabit, privacyLevel: 2 },
      "2026-10-10",
    );
    expect(payloadLevel2.title).toContain("Aroma Terapi");
    expect(payloadLevel2.title).not.toContain("Merokok");
    expect(payloadLevel2.message).not.toContain("Merokok");

    // Level 0: Normal
    const payloadLevel0 = buildCheckinNotificationPayload(
      { ...rawHabit, privacyLevel: 0 },
      "2026-10-10",
    );
    expect(payloadLevel0.title).toContain("Merokok / Vaping Rahasia");
  });

  // Expiration PENDING > 72 jam -> UNCONFIRMED
  it("Transisi check-in PENDING yang melewati 72 jam menjadi UNCONFIRMED", async () => {
    const nowTime = new Date("2026-10-10T12:00:00.000Z");

    const habit = await prisma.trackedHabit.create({
      data: {
        userId: user2Id,
        name: "Expired Pending Habit",
        kind: "BREAK",
        mode: "ABSTAIN",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "20:00",
        startedAt: new Date("2026-10-01T00:00:00.000Z"),
        currentWindowStart: new Date("2026-10-01T00:00:00.000Z"),
        nextCheckinAt: new Date("2026-10-11T13:00:00.000Z"), // Belum due sekarang
        breakProfile: {
          create: { whyReasons: ["Testing grace period"] },
        },
        stats: {
          create: { currentStreakDays: 3 },
        },
        checkins: {
          create: {
            periodDate: new Date("2026-10-02"),
            windowStart: new Date("2026-10-01T13:00:00.000Z"),
            windowEnd: new Date("2026-10-02T13:00:00.000Z"), // 8 hari yang lalu (> 72 jam)
            status: "PENDING",
          },
        },
      },
      include: { checkins: true },
    });

    const pendingCheckinId = habit.checkins[0].id;

    const clock = new FakeClock(nowTime);
    const result = await tickHabitsScheduler(clock);

    expect(result.expiredPendingCount).toBeGreaterThanOrEqual(1);

    const checkin = await prisma.habitCheckin.findUnique({
      where: { id: pendingCheckinId },
    });
    expect(checkin?.status).toBe("UNCONFIRMED");

    // UNCONFIRMED tidak dihitung sebagai confirmed clean
    const stats = await prisma.habitStats.findUnique({
      where: { habitId: habit.id },
    });
    expect(stats?.confirmedCleanDays).toBe(0);
  });

  // Regresi reminder lama
  it("Cron route /api/cron/reminder tetap berjalan dan mengembalikan hasil reminder dan habits", async () => {
    const req = new Request("http://localhost/api/cron/reminder");
    const res = await reminderCronRoute(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.timestamp).toBeDefined();
    expect(json.data.usersProcessed).toBeDefined();
    expect(json.data.habits).toBeDefined();
  });
});
