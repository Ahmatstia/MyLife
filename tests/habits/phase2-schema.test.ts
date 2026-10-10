import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  BUILTIN_TRIGGERS,
  seedBuiltinTriggers,
} from "@/lib/habits/triggers/library";

describe("Phase 2 Schema & Seed Tests (Langkah 2.1)", () => {
  const testUserId = "user_phase2_schema_test";
  let sampleHabitId: string;

  beforeAll(async () => {
    // Siapkan user pengujian
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        email: "phase2_schema_tester@mylife.test",
        name: "Phase 2 Schema Tester",
        passwordHash: "secure_hash",
      },
    });

    // Buat kebiasaan dasar
    const habit = await prisma.trackedHabit.create({
      data: {
        userId: testUserId,
        name: "Berhenti Begadang Phase 2",
        kind: "BREAK",
        mode: "ABSTAIN",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "07:00",
        startedAt: new Date(),
        currentWindowStart: new Date(),
      },
    });
    sampleHabitId = habit.id;
  });

  afterAll(async () => {
    await prisma.trackedHabit.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.trigger.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
  });

  describe("1. Idempotent Builtin Triggers Seed & Library", () => {
    it("menyemai pemicu bawaan secara idempoten (bisa dijalankan berulang kali)", async () => {
      // Jalankan pertama kali
      const count1 = await seedBuiltinTriggers(prisma);
      expect(count1).toBe(BUILTIN_TRIGGERS.length);

      // Jalankan kedua kali -> tidak error dan data tidak duplikat
      const count2 = await seedBuiltinTriggers(prisma);
      expect(count2).toBe(BUILTIN_TRIGGERS.length);

      const dbTriggers = await prisma.trigger.findMany({
        where: { userId: null },
      });
      expect(dbTriggers.length).toBe(BUILTIN_TRIGGERS.length);
    });

    it("memastikan pustaka bawaan mencakup HALT+B dan 8 kategori lengkap", async () => {
      const categories = new Set(BUILTIN_TRIGGERS.map((t) => t.category));
      expect(categories.has("TIME")).toBe(true);
      expect(categories.has("PLACE")).toBe(true);
      expect(categories.has("PERSON")).toBe(true);
      expect(categories.has("EMOTION")).toBe(true);
      expect(categories.has("PHYSICAL")).toBe(true);
      expect(categories.has("ACTIVITY")).toBe(true);
      expect(categories.has("DEVICE")).toBe(true);
      expect(categories.has("OTHER")).toBe(true);

      // HALT+B
      const names = BUILTIN_TRIGGERS.map((t) => t.name.toLowerCase());
      expect(names.some((n) => n.includes("hungry"))).toBe(true);
      expect(names.some((n) => n.includes("angry"))).toBe(true);
      expect(names.some((n) => n.includes("lonely"))).toBe(true);
      expect(names.some((n) => n.includes("tired"))).toBe(true);
      expect(names.some((n) => n.includes("bored"))).toBe(true);
    });
  });

  describe("2. Model Trigger & HabitTrigger", () => {
    it("dapat membuat pemicu kustom pengguna dan menautkannya ke HabitTrigger", async () => {
      // Pemicu kustom
      const customTrigger = await prisma.trigger.create({
        data: {
          userId: testUserId,
          category: "DEVICE",
          name: "Notifikasi Grup Game Discord",
          description: "Ping dari grup game saat malam",
        },
      });

      expect(customTrigger.userId).toBe(testUserId);
      expect(customTrigger.category).toBe("DEVICE");

      // Tautkan ke habit via HabitTrigger
      const habitTrigger = await prisma.habitTrigger.create({
        data: {
          habitId: sampleHabitId,
          triggerId: customTrigger.id,
          intensity: 4,
          note: "Sangat menggoda saat sepi",
        },
      });

      expect(habitTrigger.habitId).toBe(sampleHabitId);
      expect(habitTrigger.triggerId).toBe(customTrigger.id);
      expect(habitTrigger.intensity).toBe(4);

      // Unique constraint (habitId, triggerId) menolak duplikat
      await expect(
        prisma.habitTrigger.create({
          data: {
            habitId: sampleHabitId,
            triggerId: customTrigger.id,
            intensity: 3,
          },
        }),
      ).rejects.toThrow();
    });

    it("CHECK chk_ht_intensity: menolak intensity di luar rentang 1..5", async () => {
      const trigger = await prisma.trigger.create({
        data: {
          userId: testUserId,
          category: "EMOTION",
          name: "Stres Kerja Khusus",
        },
      });

      // Intensity = 0 -> tolak
      await expect(
        prisma.habitTrigger.create({
          data: {
            habitId: sampleHabitId,
            triggerId: trigger.id,
            intensity: 0,
          },
        }),
      ).rejects.toThrow();

      // Intensity = 6 -> tolak
      await expect(
        prisma.habitTrigger.create({
          data: {
            habitId: sampleHabitId,
            triggerId: trigger.id,
            intensity: 6,
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe("3. Model CopingPlan (Rencana Jika–Maka)", () => {
    it("dapat membuat rencana jika-maka tertaut ke HabitTrigger dan melacak efektivitas", async () => {
      const trigger = await prisma.trigger.create({
        data: {
          userId: testUserId,
          category: "TIME",
          name: "Tengah Malam 00:00",
        },
      });

      const habitTrigger = await prisma.habitTrigger.create({
        data: {
          habitId: sampleHabitId,
          triggerId: trigger.id,
          intensity: 5,
        },
      });

      // Buat CopingPlan
      const plan = await prisma.copingPlan.create({
        data: {
          habitId: sampleHabitId,
          habitTriggerId: habitTrigger.id,
          ifCondition: "Jam menunjukkan 23:30 dan masih di depan laptop",
          thenAction: "Matikan laptop, letakkan ponsel di ruang tamu, dan ambil buku fisik",
          timesUsed: 5,
          timesHelped: 4,
          order: 1,
        },
      });

      expect(plan.id).toBeDefined();
      expect(plan.ifCondition).toContain("23:30");
      expect(plan.thenAction).toContain("Matikan laptop");
      expect(plan.timesUsed).toBe(5);
      expect(plan.timesHelped).toBe(4);
    });

    it("CHECK chk_cp_times: menolak timesHelped > timesUsed atau timesUsed < 0", async () => {
      // timesHelped (6) > timesUsed (5) -> tolak
      await expect(
        prisma.copingPlan.create({
          data: {
            habitId: sampleHabitId,
            ifCondition: "Jika dorongan muncul",
            thenAction: "Tarik napas 4-7-8",
            timesUsed: 5,
            timesHelped: 6,
          },
        }),
      ).rejects.toThrow();

      // timesUsed < 0 -> tolak
      await expect(
        prisma.copingPlan.create({
          data: {
            habitId: sampleHabitId,
            ifCondition: "Jika dorongan muncul",
            thenAction: "Tarik napas 4-7-8",
            timesUsed: -1,
            timesHelped: 0,
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe("4. Model HabitEventTrigger, HabitMilestone, & SupportResource", () => {
    it("menautkan HabitEvent ke HabitTrigger via HabitEventTrigger saat debrief", async () => {
      const trigger = await prisma.trigger.create({
        data: {
          userId: testUserId,
          category: "PLACE",
          name: "Kamar Mandi Malam Hari",
        },
      });

      const habitTrigger = await prisma.habitTrigger.create({
        data: {
          habitId: sampleHabitId,
          triggerId: trigger.id,
          intensity: 3,
        },
      });

      const event = await prisma.habitEvent.create({
        data: {
          habitId: sampleHabitId,
          userId: testUserId,
          type: "LAPSE",
          occurredAt: new Date(),
          source: "APP",
          severity: "SLIP",
        },
      });

      const eventTrigger = await prisma.habitEventTrigger.create({
        data: {
          eventId: event.id,
          habitTriggerId: habitTrigger.id,
        },
      });

      expect(eventTrigger.eventId).toBe(event.id);
      expect(eventTrigger.habitTriggerId).toBe(habitTrigger.id);

      // Duplikat tautan ditolak
      await expect(
        prisma.habitEventTrigger.create({
          data: {
            eventId: event.id,
            habitTriggerId: habitTrigger.id,
          },
        }),
      ).rejects.toThrow();
    });

    it("mencatat milestone waktu bersih pada HabitMilestone dan menolak duplikat kode", async () => {
      const milestone = await prisma.habitMilestone.create({
        data: {
          habitId: sampleHabitId,
          code: "STREAK_7",
          title: "7 Hari Bersih Penuh",
          achievedAt: new Date(),
        },
      });

      expect(milestone.code).toBe("STREAK_7");

      // Unique (habitId, code)
      await expect(
        prisma.habitMilestone.create({
          data: {
            habitId: sampleHabitId,
            code: "STREAK_7",
            title: "7 Hari Bersih Duplikat",
            achievedAt: new Date(),
          },
        }),
      ).rejects.toThrow();
    });

    it("menyimpan dan membaca data SupportResource", async () => {
      const resource = await prisma.supportResource.create({
        data: {
          country: "ID",
          category: "CRISIS",
          name: "Layanan Sejiwa (Kemenkes)",
          contact: "119 ext 8",
          description: "Layanan konsultasi psikologis gratis dari Kemenkes RI",
          isVerified: true,
          verifiedAt: new Date(),
          sourceUrl: "https://sejiwa.kemenkes.go.id",
        },
      });

      expect(resource.id).toBeDefined();
      expect(resource.contact).toBe("119 ext 8");
      expect(resource.isVerified).toBe(true);

      const found = await prisma.supportResource.findMany({
        where: { country: "ID", category: "CRISIS" },
      });
      expect(found.some((r) => r.contact === "119 ext 8")).toBe(true);
    });
  });

  describe("5. Cascade Deletes & Relational Integrity", () => {
    it("menghapus TrackedHabit menghapus seluruh HabitTrigger, CopingPlan, dan HabitMilestone terkait", async () => {
      // Buat habit sementara
      const tempHabit = await prisma.trackedHabit.create({
        data: {
          userId: testUserId,
          name: "Kebiasaan Sementara untuk Cascade",
          kind: "BREAK",
          mode: "ABSTAIN",
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          startedAt: new Date(),
          currentWindowStart: new Date(),
        },
      });

      const trigger = await prisma.trigger.create({
        data: {
          userId: testUserId,
          category: "PHYSICAL",
          name: "Kelelahan Ekstrem",
        },
      });

      const ht = await prisma.habitTrigger.create({
        data: {
          habitId: tempHabit.id,
          triggerId: trigger.id,
        },
      });

      const cp = await prisma.copingPlan.create({
        data: {
          habitId: tempHabit.id,
          habitTriggerId: ht.id,
          ifCondition: "Jika lelah",
          thenAction: "Tidur 20 menit",
        },
      });

      const ms = await prisma.habitMilestone.create({
        data: {
          habitId: tempHabit.id,
          code: "STREAK_3",
          title: "3 Hari Bersih",
          achievedAt: new Date(),
        },
      });

      // Hapus habit
      await prisma.trackedHabit.delete({
        where: { id: tempHabit.id },
      });

      // Verifikasi relasi anak terhapus secara cascade
      expect(await prisma.habitTrigger.findUnique({ where: { id: ht.id } })).toBeNull();
      expect(await prisma.copingPlan.findUnique({ where: { id: cp.id } })).toBeNull();
      expect(await prisma.habitMilestone.findUnique({ where: { id: ms.id } })).toBeNull();

      // Pemicu dasar tetap ada (tidak terhapus)
      const survivingTrigger = await prisma.trigger.findUnique({ where: { id: trigger.id } });
      expect(survivingTrigger).toBeDefined();
    });
  });
});
