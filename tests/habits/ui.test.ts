import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import {
  createTrackedHabitService,
  getTrackedHabitDashboardService,
  logHabitEventService,
  respondCheckinService,
} from "@/services/habits";

describe("Habits v2 UI Logic & Contract Tests (Langkah 1.6)", () => {
  const testUserId = "user_ui_test_v2";

  beforeAll(async () => {
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        email: "habits_ui_test@mylife.test",
        name: "UI Habits Tester",
        passwordHash: "secure_hash",
      },
    });
  });

  afterAll(async () => {
    await prisma.trackedHabit.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
  });

  describe("1. Feature Flag Contract & Page Switcher", () => {
    it("evaluates feature flag correctly without altering legacy view when unset or 0", () => {
      const isV2Active = (env: Record<string, string | undefined>) =>
        env.HABITS_V2 === "1" || env.NEXT_PUBLIC_HABITS_V2 === "1";

      expect(isV2Active({})).toBe(false);
      expect(isV2Active({ HABITS_V2: "0" })).toBe(false);
      expect(isV2Active({ HABITS_V2: "false" })).toBe(false);
      expect(isV2Active({ NEXT_PUBLIC_HABITS_V2: "0" })).toBe(false);

      expect(isV2Active({ HABITS_V2: "1" })).toBe(true);
      expect(isV2Active({ NEXT_PUBLIC_HABITS_V2: "1" })).toBe(true);
      expect(isV2Active({ HABITS_V2: "0", NEXT_PUBLIC_HABITS_V2: "1" })).toBe(true);
    });

    it("verifies habits page imports both HabitsManager and HabitsV2App conditionally", () => {
      const pagePath = path.resolve(process.cwd(), "src/app/(app)/habits/page.tsx");
      const content = fs.readFileSync(pagePath, "utf-8");

      expect(content).toContain('import { HabitsManager } from "@/app/(app)/habits/HabitsManager"');
      expect(content).toContain('import { HabitsV2App } from "@/app/components/habits-v2"');
      expect(content).toContain("HABITS_V2");
      expect(content).toContain("<HabitsManager");
      expect(content).toContain("<HabitsV2App");
    });
  });

  describe("2. UI Copy & Supportive Language Compliance (§13.2)", () => {
    const componentsDir = path.resolve(process.cwd(), "src/app/components/habits-v2");

    it("ensures all v2 components exist and export cleanly", () => {
      const files = fs.readdirSync(componentsDir);
      expect(files).toContain("Calendar90Days.tsx");
      expect(files).toContain("RecoveryModal.tsx");
      expect(files).toContain("LogLapseModal.tsx");
      expect(files).toContain("CreateHabitWizard.tsx");
      expect(files).toContain("HabitCardV2.tsx");
      expect(files).toContain("BreakDashboard.tsx");
      expect(files).toContain("HabitsV2App.tsx");
      expect(files).toContain("SosUrgeSurfingModal.tsx");
      expect(files).toContain("DebriefModal.tsx");
      expect(files).toContain("index.ts");
    });

    it("strictly forbids harsh/judgmental wording and medical claims across v2 UI", () => {
      const files = fs.readdirSync(componentsDir).filter((f) => f.endsWith(".tsx"));
      const forbiddenHarshWords = [
        "gagal",
        "kalah",
        "hancur",
        "rusak",
        "malu",
        "kecewa",
        "dosa",
        "sembuh",
        "penyakit",
        "terapi medis",
      ];

      for (const file of files) {
        const filePath = path.join(componentsDir, file);
        const content = fs.readFileSync(filePath, "utf-8").toLowerCase();

        for (const word of forbiddenHarshWords) {
          const regex = new RegExp(`\\b${word}\\b`, "i");
          expect(
            regex.test(content),
            `File ${file} should not contain harsh word or medical claim "${word}"`
          ).toBe(false);
        }
      }
    });

    it("includes required supportive recovery messages in RecoveryModal", () => {
      const recoveryModalPath = path.join(componentsDir, "RecoveryModal.tsx");
      const content = fs.readFileSync(recoveryModalPath, "utf-8");

      expect(content).toContain("Hari ini terpeleset. Progresmu yang lain tetap ada.");
      expect(content).toContain("Mulai hitungan baru, bawa pelajaran yang sama.");
    });

    it("avoids harsh red background colors for slips in LogLapseModal and RecoveryModal", () => {
      const logLapsePath = path.join(componentsDir, "LogLapseModal.tsx");
      const recoveryPath = path.join(componentsDir, "RecoveryModal.tsx");
      const logLapseContent = fs.readFileSync(logLapsePath, "utf-8");
      const recoveryContent = fs.readFileSync(recoveryPath, "utf-8");

      expect(logLapseContent).not.toContain("bg-red-600");
      expect(logLapseContent).not.toContain("bg-red-700");
      expect(recoveryContent).not.toContain("bg-red-600");
      expect(recoveryContent).not.toContain("bg-red-700");
    });

    it("verifies DebriefModal implements 4 situational reflection questions (F-B4)", () => {
      const debriefPath = path.join(componentsDir, "DebriefModal.tsx");
      const content = fs.readFileSync(debriefPath, "utf-8");

      expect(content).toContain("Apa yang terjadi tepat sebelum kejadian ini?");
      expect(content).toContain("Bagaimana kondisi tubuh dan perasaanmu saat itu?");
      expect(content).toContain("Apa yang berhasil menahanmu sebelumnya, atau apa yang bisa diubah?");
      expect(content).toContain("Rencana Jika–Maka apa yang ingin kamu tambahkan?");
      expect(content).toContain("Lewati Refleksi");
    });
  });

  describe("3. UI Flow Contract Simulation (E2E API + UI Action Mapping)", () => {
    it("simulates 'Jawab Check-in Bersih' flow initiated from BreakDashboard", async () => {
      // 1. Buat habit Break dengan waktu check-in 20:00
      const habit = await createTrackedHabitService(testUserId, {
        name: "Berhenti Merokok UI Test",
        kind: "BREAK",
        mode: "ABSTAIN",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "20:00",
        whyReasons: ["Kesehatan paru-paru", "Hemat uang bulanan"],
      });

      // 2. Buat check-in PENDING simulasi hari ini
      const checkin = await prisma.habitCheckin.create({
        data: {
          habitId: habit.id,
          windowStart: new Date(Date.now() - 3600_000 * 24),
          windowEnd: new Date(Date.now() - 3600_000 * 2),
          periodDate: new Date("2026-10-09T00:00:00.000Z"),
          status: "PENDING",
        },
      });

      // 3. User menekan 'Bersih' pada banner check-in di BreakDashboard
      const responded = await respondCheckinService(testUserId, habit.id, checkin.id, {
        response: "CLEAN",
        note: "Hari ini aman dan tenang",
      });

      expect(responded.checkin.status).toBe("CLEAN");
      expect(responded.checkin.respondedAt).toBeDefined();

      // 4. Dashboard merender ulang data habit dan streak terhitung
      const dashboard = await getTrackedHabitDashboardService(testUserId, habit.id);
      expect(dashboard.habit.id).toBe(habit.id);
      expect(dashboard.pendingCheckins.find((c: { id: string }) => c.id === checkin.id)).toBeUndefined();
    });

    it("simulates 'Catat Terpeleset' flow initiated from LogLapseModal and displays RecoveryModal metrics", async () => {
      // 1. Buat habit Break
      const habit = await createTrackedHabitService(testUserId, {
        name: "Berhenti Begadang UI Test",
        kind: "BREAK",
        mode: "ABSTAIN",
        timezone: "Asia/Jakarta",
        checkinLocalTime: "07:00",
        whyReasons: ["Fokus kerja pagi", "Jantung sehat"],
      });

      // Update startedAt ke masa lalu agar check-in dan kejadian valid
      await prisma.trackedHabit.update({
        where: { id: habit.id },
        data: { startedAt: new Date(Date.now() - 3600_000 * 96) },
      });

      // 2. Simulasikan habit sudah punya hari bersih di masa lalu dan jendela yang berakhir
      await prisma.habitCheckin.createMany({
        data: [
          {
            habitId: habit.id,
            windowStart: new Date(Date.now() - 3600_000 * 72),
            windowEnd: new Date(Date.now() - 3600_000 * 48),
            periodDate: new Date("2026-10-07T00:00:00.000Z"),
            status: "CLEAN",
          },
          {
            habitId: habit.id,
            windowStart: new Date(Date.now() - 3600_000 * 48),
            windowEnd: new Date(Date.now() - 3600_000 * 24),
            periodDate: new Date("2026-10-08T00:00:00.000Z"),
            status: "CLEAN",
          },
          {
            habitId: habit.id,
            windowStart: new Date(Date.now() - 3600_000 * 24),
            windowEnd: new Date(Date.now() - 3600_000 * 1),
            periodDate: new Date("2026-10-09T00:00:00.000Z"),
            status: "PENDING",
          },
        ],
      });

      // 3. User membuka LogLapseModal dan mencatat terpeleset pada 2 jam lalu (di dalam jendela ketiga yang sudah berakhir)
      const slipTime = new Date(Date.now() - 3600_000 * 2);
      const event = await logHabitEventService(testUserId, habit.id, {
        type: "LAPSE",
        occurredAt: slipTime,
        severity: "SLIP",
        mood: 3,
        note: "Kelelahan setelah lembur",
        quantity: 1,
      });

      expect(event.type).toBe("LAPSE");
      expect(event.severity).toBe("SLIP");

      // 4. Dashboard merender metrics untuk RecoveryModal:
      // confirmedCleanDays tetap mempertahankan hari bersih yang sudah dicapai,
      // longestStreakDays tetap ada walau current streak kembali ke 0
      const dashboard = await getTrackedHabitDashboardService(testUserId, habit.id);
      expect(dashboard.stats?.currentStreakDays).toBe(0);
      expect(dashboard.stats?.confirmedCleanDays).toBeGreaterThanOrEqual(2);
      expect(dashboard.stats?.longestStreakDays).toBeGreaterThanOrEqual(2);
      expect(dashboard.stats?.lastLapseAt).toBeDefined();
    });
  });

  describe("4. SOS Urge Surfing Contract & ≤ 2 Taps Accessibility", () => {
    it("verifies BreakDashboard provides prominent and floating SOS buttons (≤ 2 taps)", () => {
      const dashboardPath = path.resolve(
        process.cwd(),
        "src/app/components/habits-v2/BreakDashboard.tsx",
      );
      const content = fs.readFileSync(dashboardPath, "utf-8");

      expect(content).toContain('id="dashboard-sos-btn"');
      expect(content).toContain('id="floating-sos-btn"');
      expect(content).toContain("<SosUrgeSurfingModal");
      expect(content).toContain("showSos");
    });

    it("verifies SosUrgeSurfingModal implements all 7 steps of F-B3 with supportive language", () => {
      const modalPath = path.resolve(
        process.cwd(),
        "src/app/components/habits-v2/SosUrgeSurfingModal.tsx",
      );
      const content = fs.readFileSync(modalPath, "utf-8");

      // 7 Langkah F-B3
      expect(content).toContain("Langkah {step} dari 7");
      expect(content).toContain("Ini hanyalah sebuah dorongan, bukan perintah");
      expect(content).toContain("Timer Penundaan");
      expect(content).toContain("Box Breathing");
      expect(content).toContain("HALT+B");
      expect(content).toContain("Evaluasi Intensitas");
      expect(content).toContain("RESISTED");
      expect(content).toContain("GAVE_IN");
      expect(content).toContain("Simpan & Selesaikan SOS");

      // Non-judgmental language check (§13.2)
      expect(content.toLowerCase()).not.toContain("gagal");
      expect(content.toLowerCase()).not.toContain("kambuh kotor");
    });
  });
});
