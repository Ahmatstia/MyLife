import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { FakeClock } from "@/lib/habits/clock";
import { HabitKind, HabitReminderKind } from "@/generated/prisma/client";
import { createTrackedHabitService } from "@/services/habits/habit-v2.service";
import {
  createHabitReminderService,
  listHabitRemindersService,
  toggleHabitReminderService,
  deleteHabitReminderService,
  checkDailyNotificationQuota,
} from "@/services/habits/reminder.service";
import {
  getWeeklyReflectionPromptService,
  submitWeeklyReflectionService,
  getReengagementStatusService,
} from "@/services/habits/reflection.service";
import {
  isInQuietHours,
  computeRiskWindowReminderTime,
  formatNeutralReminderText,
} from "@/lib/habits/reminders";

describe("Habits v2 - Langkah 4.3 & 4.4: Reminders, Quiet Hours, and Weekly Reflection Integration", () => {
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `reminders-test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
        name: "Reminders Test User",
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  });

  describe("Langkah 4.3: Aturan Jam Tenang & Format Netral", () => {
    it("Mendeteksi jam tenang (22:00 - 06:00) dengan benar", () => {
      expect(isInQuietHours("22:30")).toBe(true);
      expect(isInQuietHours("23:59")).toBe(true);
      expect(isInQuietHours("02:00")).toBe(true);
      expect(isInQuietHours("05:59")).toBe(true);

      // Di luar jam tenang
      expect(isInQuietHours("06:00")).toBe(false);
      expect(isInQuietHours("12:00")).toBe(false);
      expect(isInQuietHours("20:30")).toBe(false);
      expect(isInQuietHours("21:59")).toBe(false);
    });

    it("Menolak pembuatan pengingat jika disetel pada jam tenang", async () => {
      const habit = await createTrackedHabitService(userId, {
        name: "Jalan Santai",
        kind: HabitKind.BUILD,
        tinyBehavior: "Berjalan 5 menit",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "20:00",
        startedAt: new Date(),
      });

      await expect(
        createHabitReminderService(userId, habit.id, {
          kind: HabitReminderKind.CHECKIN,
          localTime: "23:30", // Dalam jam tenang
        })
      ).rejects.toThrow("Jam Tenang (22:00 - 06:00)");
    });

    it("Menghitung waktu pengingat jendela rawan 30 menit sebelum jam rawan", () => {
      const calc1 = computeRiskWindowReminderTime(20, 30); // rawan jam 20:00
      expect(calc1.localTime).toBe("19:30");

      const calc2 = computeRiskWindowReminderTime(0, 30); // rawan jam 00:00
      expect(calc2.localTime).toBe("23:30");
      expect(isInQuietHours(calc2.localTime)).toBe(true); // Terdeteksi dalam jam tenang
    });

    it("Format teks netral: menyamarkan detail jika privacyLevel >= 1 atau 2", () => {
      const habitLevel0 = { name: "Berhenti Merokok", privacyLevel: 0 };
      const habitLevel1 = { name: "Berhenti Merokok", privacyLevel: 1 };
      const habitLevel2 = {
        name: "Berhenti Merokok",
        displayAlias: "Projek Sehat",
        privacyLevel: 2,
      };

      const text0 = formatNeutralReminderText(HabitReminderKind.CHECKIN, habitLevel0);
      expect(text0.body).toContain("Berhenti Merokok");

      const text1 = formatNeutralReminderText(HabitReminderKind.CHECKIN, habitLevel1);
      expect(text1.body).not.toContain("Merokok");
      expect(text1.body).toContain("Kebiasaan Anda");

      const text2 = formatNeutralReminderText(HabitReminderKind.CHECKIN, habitLevel2);
      expect(text2.body).toContain("Projek Sehat");
      expect(text2.body).not.toContain("Merokok");
    });

    it("Batas kuota harian: membatasi maksimum notifikasi per hari", async () => {
      const habit = await createTrackedHabitService(userId, {
        name: "Membaca Buku",
        kind: HabitKind.BUILD,
        tinyBehavior: "Membaca 1 halaman",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "20:00",
        startedAt: new Date(),
      });

      const today = new Date("2026-10-15T10:00:00.000Z");

      // Cek saat belum ada notifikasi
      const quotaAvailable = await checkDailyNotificationQuota(userId, today, 2);
      expect(quotaAvailable).toBe(true);

      // Buat 2 outbox notifikasi di hari yang sama
      await prisma.habitNotificationOutbox.createMany({
        data: [
          {
            userId,
            habitId: habit.id,
            kind: "CHECKIN",
            payload: {},
            scheduledAt: new Date("2026-10-15T11:00:00.000Z"),
            dedupeKey: `outbox-${Date.now()}-1`,
            status: "PENDING",
          },
          {
            userId,
            habitId: habit.id,
            kind: "RISK_WINDOW",
            payload: {},
            scheduledAt: new Date("2026-10-15T14:00:00.000Z"),
            dedupeKey: `outbox-${Date.now()}-2`,
            status: "PENDING",
          },
        ],
      });

      // Cek kuota setelah 2 notifikasi dengan limit max 2
      const quotaExceeded = await checkDailyNotificationQuota(userId, today, 2);
      expect(quotaExceeded).toBe(false);
    });
  });

  describe("Langkah 4.3: CRUD Pengingat Kebiasaan", () => {
    it("Berhasil membuat, melihat, mengubah status aktif, dan menghapus pengingat", async () => {
      const habit = await createTrackedHabitService(userId, {
        name: "Olahraga Pagi",
        kind: HabitKind.BUILD,
        tinyBehavior: "Push up 1x",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "20:00",
        startedAt: new Date(),
      });

      // Buat pengingat jam 07:00
      const created = await createHabitReminderService(userId, habit.id, {
        kind: HabitReminderKind.ANCHOR,
        localTime: "07:00",
        daysOfWeek: [1, 3, 5],
      });

      expect(created.id).toBeDefined();
      expect(created.localTime).toBe("07:00");
      expect(created.isActive).toBe(true);

      // List pengingat
      const list = await listHabitRemindersService(userId, habit.id);
      expect(list.reminders.length).toBeGreaterThanOrEqual(1);

      // Toggle nonaktif
      const disabled = await toggleHabitReminderService(
        userId,
        habit.id,
        created.id,
        false
      );
      expect(disabled.isActive).toBe(false);
      expect(disabled.nextFireAt).toBeNull();

      // Hapus
      const del = await deleteHabitReminderService(userId, habit.id, created.id);
      expect(del.success).toBe(true);

      const afterList = await listHabitRemindersService(userId, habit.id);
      expect(afterList.reminders.find((r) => r.id === created.id)).toBeUndefined();
    });
  });

  describe("Langkah 4.4: Refleksi Mingguan & Re-engagement", () => {
    it("Menyediakan satu pertanyaan reflektif mingguan dan menyimpan jawabannya", async () => {
      const clock = new FakeClock(new Date("2026-10-15T12:00:00.000Z"));

      const habit = await createTrackedHabitService(
        userId,
        {
          name: "Belajar Koding",
          kind: HabitKind.BUILD,
          tinyBehavior: "Koding 10 menit",
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          startedAt: new Date("2026-10-01T00:00:00.000Z"),
        },
        clock
      );

      const prompt = await getWeeklyReflectionPromptService(
        userId,
        habit.id,
        prisma,
        clock
      );

      expect(prompt.currentReflection).toBeDefined();
      expect(prompt.currentReflection.question).toBeDefined();
      expect(prompt.currentReflection.question.length).toBeGreaterThan(10);

      // Simpan jawaban
      const submitted = await submitWeeklyReflectionService(
        userId,
        habit.id,
        prompt.currentReflection.id,
        "Menaruh laptop di meja kerja di malam sebelumnya sangat membantu memulai pagi ini.",
        prisma,
        clock
      );

      expect(submitted.answer).toContain("Menaruh laptop");
      expect(submitted.submittedAt).toBeDefined();
    });

    it("Re-engagement: memicu pesan hangat tanpa rasa bersalah setelah 3 hari tidak aktif", async () => {
      // Habit dibuat 4 hari lalu tanpa aktivitas lanjutan
      const startedAt = new Date("2026-10-10T00:00:00.000Z");
      const clock = new FakeClock(new Date("2026-10-15T00:00:00.000Z")); // 5 hari kemudian

      const habit = await createTrackedHabitService(
        userId,
        {
          name: "Membaca Buku Lama",
          kind: HabitKind.BUILD,
          tinyBehavior: "Baca 1 lembar",
          timezone: "Asia/Jakarta",
          checkinLocalTime: "20:00",
          startedAt,
        },
        new FakeClock(startedAt)
      );

      const status = await getReengagementStatusService(
        userId,
        habit.id,
        prisma,
        clock
      );

      expect(status.isInactiveFor3Days).toBe(true);
      expect(status.reengagementMessage).not.toBeNull();
      expect(status.reengagementMessage?.text).toContain(
        "selalu menyambut kehadiranmu kapan pun kamu siap melangkah"
      );
      // Memastikan pesan tidak mengandung kata-kata yang menyalahkan
      expect(status.reengagementMessage?.text).not.toContain("gagal");
      expect(status.reengagementMessage?.text).not.toContain("mengecewakan");
    });
  });
});
