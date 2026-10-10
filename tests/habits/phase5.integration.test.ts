import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createTrackedHabitService,
  logHabitEventService,
  deleteTrackedHabitService,
} from "@/services/habits";
import { exportUserData } from "@/services/data-export.service";
import { decryptText } from "@/lib/habits/safety/crypto";

describe("Habits v2 Fase 5 Integration Tests (Privasi, Ekspor/Hapus, Integrasi)", () => {
  const testUserId = "user_phase5_test";

  beforeAll(async () => {
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        email: "phase5_test@mylife.test",
        name: "Phase 5 Tester",
        passwordHash: "secure_hash",
      },
    });
  });

  afterAll(async () => {
    await prisma.trackedHabit.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.goal.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
  });

  describe("5.1 & 5.2 — Encryption, Privacy & Full Cascade Deletion", () => {
    it("encrypts sensitive fields at application level and cleans up 100% of rows on hard delete", async () => {
      const secretNote = "Rahasia pribadi yang sangat sensitif";
      const secretLocation = "Ruang kerja tersembunyi";
      const secretWithWhom = "Teman akrab";
      const secretFutureNote = "Pesan untuk masa depan saya";

      // 1. Buat kebiasaan BREAK dengan data sensitif
      const habit = await createTrackedHabitService(testUserId, {
        name: "Kebiasaan Rahasia",
        displayAlias: "Aktivitas Tenang",
        kind: "BREAK",
        mode: "ABSTAIN",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "21:00",
        whyReasons: ["Ingin lebih sehat", "Ingin lebih tenang"],
        futureSelfNote: secretFutureNote,
        privacyLevel: 2,
      });

      // 2. Catat event dengan catatan sensitif
      const event = await logHabitEventService(testUserId, habit.id, {
        type: "LAPSE",
        occurredAt: new Date(),
        note: secretNote,
        locationLabel: secretLocation,
        withWhom: secretWithWhom,
      });

      // 3. Verifikasi di DB mentah: tersimpan dalam bentuk ciphertext berawalan 'v1:'
      const rawEvent = await prisma.habitEvent.findUnique({
        where: { id: event.id },
      });
      expect(rawEvent?.note).toMatch(/^v1:/);
      expect(rawEvent?.note).not.toBe(secretNote);
      expect(decryptText(rawEvent?.note)).toBe(secretNote);

      const rawProfile = await prisma.habitBreakProfile.findUnique({
        where: { habitId: habit.id },
      });
      expect(rawProfile?.futureSelfNote).toMatch(/^v1:/);
      expect(decryptText(rawProfile?.futureSelfNote)).toBe(secretFutureNote);

      // 4. Tambahkan reminder & reflection terkait
      await prisma.habitReminder.create({
        data: {
          habitId: habit.id,
          kind: "CHECKIN",
          localTime: "21:00",
          daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
          nextFireAt: new Date(),
        },
      });

      await prisma.habitReflection.create({
        data: {
          habitId: habit.id,
          weekStart: new Date("2026-10-05T00:00:00Z"),
          question: "Bagaimana evaluasi minggu ini?",
          answer: "Minggu yang cukup menantang",
        },
      });

      // Verifikasi baris-baris ini ada sebelum penghapusan
      expect(await prisma.habitEvent.count({ where: { habitId: habit.id } })).toBeGreaterThan(0);
      expect(await prisma.habitReminder.count({ where: { habitId: habit.id } })).toBe(1);
      expect(await prisma.habitReflection.count({ where: { habitId: habit.id } })).toBe(1);

      // 5. Jalankan hard delete (Langkah 5.2)
      const deleteResult = await deleteTrackedHabitService(testUserId, habit.id, { hard: true });
      expect(deleteResult.hardDeleted).toBe(true);

      // 6. Verifikasi 0 baris tersisa di seluruh tabel terkait (Clean Cascade)
      const remainingHabit = await prisma.trackedHabit.findUnique({ where: { id: habit.id } });
      const remainingBreakProfile = await prisma.habitBreakProfile.findUnique({ where: { habitId: habit.id } });
      const remainingStats = await prisma.habitStats.findUnique({ where: { habitId: habit.id } });
      const remainingEvents = await prisma.habitEvent.count({ where: { habitId: habit.id } });
      const remainingCheckins = await prisma.habitCheckin.count({ where: { habitId: habit.id } });
      const remainingReminders = await prisma.habitReminder.count({ where: { habitId: habit.id } });
      const remainingReflections = await prisma.habitReflection.count({ where: { habitId: habit.id } });

      expect(remainingHabit).toBeNull();
      expect(remainingBreakProfile).toBeNull();
      expect(remainingStats).toBeNull();
      expect(remainingEvents).toBe(0);
      expect(remainingCheckins).toBe(0);
      expect(remainingReminders).toBe(0);
      expect(remainingReflections).toBe(0);
    });

    it("archives habit cleanly when hard=false without deleting historical rows", async () => {
      const habit = await createTrackedHabitService(testUserId, {
        name: "Kebiasaan Diarsipkan",
        kind: "BREAK",
        mode: "ABSTAIN",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "20:00",
        whyReasons: ["Ingin jeda"],
      });

      const res = await deleteTrackedHabitService(testUserId, habit.id, { hard: false });
      expect(res.hardDeleted).toBe(false);

      const dbHabit = await prisma.trackedHabit.findUnique({ where: { id: habit.id } });
      expect(dbHabit?.status).toBe("ARCHIVED");

      // Bersihkan
      await prisma.trackedHabit.delete({ where: { id: habit.id } });
    });
  });

  describe("5.2 — Data Export Completeness", () => {
    it("includes tracked habits in exportUserData with transparently decrypted notes", async () => {
      const sensitiveNote = "Catatan sangat pribadi saat refleksi";
      const sensitiveFutureNote = "Janji pada diri sendiri";

      const habit = await createTrackedHabitService(testUserId, {
        name: "Kebiasaan Ekspor",
        kind: "BREAK",
        mode: "ABSTAIN",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "20:00",
        whyReasons: ["Untuk ekspor data"],
        futureSelfNote: sensitiveFutureNote,
      });

      await logHabitEventService(testUserId, habit.id, {
        type: "LAPSE",
        occurredAt: new Date(),
        note: sensitiveNote,
      });

      // Panggil exportUserData
      const exported = await exportUserData(testUserId);

      expect(exported.trackedHabits).toBeDefined();
      expect(Array.isArray(exported.trackedHabits)).toBe(true);

      const exportedHabit = (exported.trackedHabits as Array<{
        id: string;
        name: string;
        breakProfile?: { futureSelfNote?: string | null } | null;
        events: Array<{ note?: string | null }>;
      }>).find((h) => h.id === habit.id);

      expect(exportedHabit).toBeDefined();
      expect(exportedHabit?.name).toBe("Kebiasaan Ekspor");
      expect(exportedHabit?.breakProfile?.futureSelfNote).toBe(sensitiveFutureNote);
      expect(exportedHabit?.events[0]?.note).toBe(sensitiveNote);

      // Bersihkan
      await deleteTrackedHabitService(testUserId, habit.id, { hard: true });
    });
  });

  describe("5.3 — Goal Link & Isolation", () => {
    it("links habit to a goal without affecting core habit tracking and handles goal deletion gracefully", async () => {
      // 1. Buat Goal
      const goal = await prisma.goal.create({
        data: {
          userId: testUserId,
          title: "Meningkatkan Gaya Hidup Sehat",
          type: "HABIT",
          status: "ACTIVE",
        },
      });

      // 2. Buat TrackedHabit yang terhubung dengan goalId
      const habit = await createTrackedHabitService(testUserId, {
        name: "Tidur Tepat Waktu",
        kind: "BUILD",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "22:00",
        tinyBehavior: "Mematikan layar HP jam 21:30",
        goalId: goal.id,
      });

      expect(habit.goalId).toBe(goal.id);

      // Verifikasi di DB
      const dbHabit = await prisma.trackedHabit.findUnique({
        where: { id: habit.id },
        include: { goal: true },
      });
      expect(dbHabit?.goalId).toBe(goal.id);
      expect(dbHabit?.goal?.title).toBe("Meningkatkan Gaya Hidup Sehat");

      // 3. Hapus Goal -> habit.goalId harus menjadi null (onDelete: SetNull), tidak menghapus habit
      await prisma.goal.delete({
        where: { id: goal.id },
      });

      const habitAfterGoalDelete = await prisma.trackedHabit.findUnique({
        where: { id: habit.id },
      });
      expect(habitAfterGoalDelete).not.toBeNull();
      expect(habitAfterGoalDelete?.goalId).toBeNull();

      // Bersihkan
      await deleteTrackedHabitService(testUserId, habit.id, { hard: true });
    });
  });
});
