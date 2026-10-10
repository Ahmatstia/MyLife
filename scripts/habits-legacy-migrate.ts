import fs from "node:fs";
import path from "node:path";
import { DateTime } from "luxon";
import { prisma } from "../src/lib/prisma";
import type { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { computeStats } from "../src/lib/habits/streak";
import { detectRelapsePattern } from "../src/lib/habits/relapse";
import { nextCheckinAfter } from "../src/lib/habits/window";

export interface MigrationOptions {
  mode: "A" | "B";
  dryRun: boolean;
  outDir?: string;
}

export interface HabitStreakComparison {
  habitId: string;
  title: string;
  kind?: "BREAK" | "BUILD";
  legacyStreakDays: number;
  newStreakDays: number;
  streakDiff: number;
  totalLogs: number;
  cleanCheckins: number;
  lapseEvents: number;
  completionEvents?: number;
}

export interface MigrationReport {
  mode: "A" | "B";
  dryRun: boolean;
  totalLegacyHabits: number;
  badHabitsCount: number;
  goodHabitsDeferredCount: number;
  goodHabitsProcessedCount?: number;
  totalLogsProcessed: number;
  cleanCheckinsCreated: number;
  lapseEventsCreated: number;
  completionEventsCreated?: number;
  streakComparisons: HabitStreakComparison[];
  exportFilePath?: string;
}

/**
 * Helper untuk mem-parsing jam checkin "HH:mm" menjadi jam dan menit.
 */
function parseCheckinTime(timeStr: string): { hour: number; minute: number } {
  const parts = timeStr.split(":");
  const hour = Number.parseInt(parts[0] || "20", 10);
  const minute = Number.parseInt(parts[1] || "0", 10);
  return {
    hour: Number.isNaN(hour) ? 20 : hour,
    minute: Number.isNaN(minute) ? 0 : minute,
  };
}

/**
 * Skrip migrasi kebiasaan lama ke Habits v2.
 * Jalur A: Migrasi kebiasaan Habit(BAD) -> TrackedHabit(BREAK/ABSTAIN).
 * Jalur B: Ekspor cadangan seluruh kebiasaan lama ke format JSON.
 */
export async function runHabitsLegacyMigration(
  options: MigrationOptions,
  client: PrismaClient = prisma,
): Promise<MigrationReport> {
  const { mode, dryRun, outDir = process.cwd() } = options;

  console.log("==========================================================");
  console.log(`[Habits Migration] Mode: Jalur ${mode} | Dry-run: ${dryRun}`);
  console.log("==========================================================");

  // Ambil semua kebiasaan lama
  const legacyHabits = await client.habit.findMany({
    include: {
      logs: { orderBy: { date: "asc" } },
      streaks: true,
      user: {
        include: {
          preference: true,
        },
      },
    },
  });

  const badHabits = legacyHabits.filter((h) => h.type === "BAD");
  const goodHabits = legacyHabits.filter((h) => h.type === "GOOD");

  console.log(`Ditemukan ${legacyHabits.length} kebiasaan lama:`);
  console.log(`- ${badHabits.length} kebiasaan BAD (Break/Abstain) siap diproses`);
  console.log(`- ${goodHabits.length} kebiasaan GOOD (Build) siap diproses`);

  // JALUR B: Ekspor cadangan JSON
  if (mode === "B") {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `habits-legacy-export-${timestamp}.json`;
    const fullPath = path.join(outDir, fileName);

    const payload = {
      exportedAt: new Date().toISOString(),
      counts: {
        total: legacyHabits.length,
        bad: badHabits.length,
        good: goodHabits.length,
      },
      habits: legacyHabits,
    };

    if (!dryRun) {
      fs.writeFileSync(fullPath, JSON.stringify(payload, null, 2), "utf-8");
      console.log(`✓ Data kebiasaan lama berhasil diekspor ke: ${fullPath}`);
    } else {
      console.log(`[Dry-Run] Simulasi ekspor ke: ${fullPath} (${legacyHabits.length} kebiasaan)`);
    }

    return {
      mode: "B",
      dryRun,
      totalLegacyHabits: legacyHabits.length,
      badHabitsCount: badHabits.length,
      goodHabitsDeferredCount: goodHabits.length,
      totalLogsProcessed: 0,
      cleanCheckinsCreated: 0,
      lapseEventsCreated: 0,
      streakComparisons: [],
      exportFilePath: fullPath,
    };
  }

  // JALUR A: Migrasi Habit(BAD) -> TrackedHabit(BREAK/ABSTAIN)
  let totalLogsProcessed = 0;
  let cleanCheckinsCreated = 0;
  let lapseEventsCreated = 0;
  const streakComparisons: HabitStreakComparison[] = [];

  for (const habit of badHabits) {
    const timezone = habit.user.preference?.timezone || "Asia/Jakarta";
    const checkinTime = habit.checkInTime || "20:00";
    const { hour: chHour, minute: chMinute } = parseCheckinTime(checkinTime);

    // Siapkan alasan (whyReasons)
    const whyReasons: string[] = [];
    if (habit.whyQuit && habit.whyQuit.trim().length > 0) {
      whyReasons.push(habit.whyQuit.trim());
    }
    if (habit.triggerNotes && habit.triggerNotes.trim().length > 0) {
      whyReasons.push(`Pemicu teridentifikasi: ${habit.triggerNotes.trim()}`);
    }
    if (whyReasons.length === 0) {
      whyReasons.push("Komitmen awal perubahan kebiasaan");
    }

    const startedAt = habit.startDate || habit.createdAt;
    const currentWindowStart = startedAt;
    const nextCheckinAt = nextCheckinAfter(currentWindowStart, timezone, checkinTime);

    // Kumpulkan logs untuk event LAPSE dan checkin CLEAN
    const eventsToCreate: Array<{
      type: "LAPSE";
      occurredAt: Date;
      quantity: number;
      source: "BACKFILL";
      severity: "SLIP";
      mood: number | null;
      note: string | null;
      meta: Record<string, unknown>;
    }> = [];

    const checkinsToCreate: Array<{
      windowStart: Date;
      windowEnd: Date;
      periodDate: Date;
      status: "CLEAN" | "LAPSED";
      mood: number | null;
      note: string | null;
    }> = [];

    for (const log of habit.logs) {
      totalLogsProcessed++;
      const logDateDt = DateTime.fromJSDate(log.date, { zone: timezone }).startOf("day");
      const windowEnd = logDateDt.set({ hour: chHour, minute: chMinute, second: 0, millisecond: 0 });
      const windowStart = windowEnd.minus({ days: 1 });

      if (log.isSuccess) {
        // Log sukses -> HabitCheckin CLEAN
        cleanCheckinsCreated++;
        checkinsToCreate.push({
          windowStart: windowStart.toJSDate(),
          windowEnd: windowEnd.toJSDate(),
          periodDate: logDateDt.toJSDate(),
          status: "CLEAN",
          mood: log.mood,
          note: log.notes,
        });
      } else {
        // Log gagal/terpeleset -> HabitEvent LAPSE (tengah hari lokal 12:00) + Checkin LAPSED
        lapseEventsCreated++;
        const noon = logDateDt.set({ hour: 12, minute: 0, second: 0, millisecond: 0 });

        checkinsToCreate.push({
          windowStart: windowStart.toJSDate(),
          windowEnd: windowEnd.toJSDate(),
          periodDate: logDateDt.toJSDate(),
          status: "LAPSED",
          mood: log.mood,
          note: log.notes,
        });

        eventsToCreate.push({
          type: "LAPSE",
          occurredAt: noon.toJSDate(),
          quantity: 1,
          source: "BACKFILL",
          severity: "SLIP",
          mood: log.mood,
          note: log.notes,
          meta: {
            legacyLogId: log.id,
            relapseTrigger: log.relapseTrigger,
          },
        });
      }
    }

    // Hitung ulang statistik menggunakan StreakEngine murni
    const now = new Date();
    const computed = computeStats(
      checkinsToCreate.map((c) => ({
        windowStart: c.windowStart,
        windowEnd: c.windowEnd,
        status: c.status,
      })),
      eventsToCreate.map((e) => ({
        type: e.type,
        occurredAt: e.occurredAt,
        deletedAt: null,
        outcome: null,
        quantity: e.quantity,
      })),
      { kind: "BREAK", mode: "ABSTAIN" },
      now,
    );

    const isRelapsing = detectRelapsePattern(
      checkinsToCreate.map((c) => ({
        windowEnd: c.windowEnd,
        status: c.status,
      })),
      { count: 3, days: 7 },
      now,
    );

    // Bandingkan dengan streak lama
    const legacyCurrentStreak = habit.streaks.find((s) => s.isCurrent)?.days ?? 0;
    const streakDiff = computed.currentStreakDays - legacyCurrentStreak;

    streakComparisons.push({
      habitId: habit.id,
      title: habit.title,
      legacyStreakDays: legacyCurrentStreak,
      newStreakDays: computed.currentStreakDays,
      streakDiff,
      totalLogs: habit.logs.length,
      cleanCheckins: checkinsToCreate.length,
      lapseEvents: eventsToCreate.length,
    });

    // Jika BUKAN dry-run, tulis ke database
    if (!dryRun) {
      await client.$transaction(async (tx) => {
        // 1. Buat TrackedHabit baru
        const tracked = await tx.trackedHabit.create({
          data: {
            userId: habit.userId,
            name: habit.title,
            kind: "BREAK",
            mode: "ABSTAIN",
            status: habit.isActive ? "ACTIVE" : "PAUSED",
            timezone,
            checkinLocalTime: checkinTime,
            startedAt,
            currentWindowStart,
            nextCheckinAt,
            privacyLevel: 1,
            breakProfile: {
              create: {
                whyReasons,
                futureSelfNote: habit.description,
                relapseLapseCount: 3,
                relapseWindowDays: 7,
              },
            },
          },
        });

        // 2. Buat check-in CLEAN
        for (const c of checkinsToCreate) {
          await tx.habitCheckin.upsert({
            where: {
              habitId_periodDate: {
                habitId: tracked.id,
                periodDate: c.periodDate,
              },
            },
            update: {},
            create: {
              habitId: tracked.id,
              windowStart: c.windowStart,
              windowEnd: c.windowEnd,
              periodDate: c.periodDate,
              status: c.status,
              mood: c.mood,
              note: c.note,
            },
          });
        }

        // 3. Buat event LAPSE
        for (const e of eventsToCreate) {
          await tx.habitEvent.create({
            data: {
              habitId: tracked.id,
              userId: habit.userId,
              type: e.type,
              occurredAt: e.occurredAt,
              quantity: e.quantity,
              source: e.source,
              severity: e.severity,
              mood: e.mood,
              note: e.note,
              meta: e.meta as Prisma.InputJsonValue,
            },
          });
        }

        // 4. Buat HabitStats
        await tx.habitStats.create({
          data: {
            habitId: tracked.id,
            currentStreakDays: computed.currentStreakDays,
            longestStreakDays: computed.longestStreakDays,
            confirmedCleanDays: computed.confirmedCleanDays,
            cleanRate30d: computed.cleanRate30d,
            lastLapseAt: computed.lastLapseAt,
            totalLapses: computed.totalLapses,
            urgesResisted: computed.urgesResisted,
            relapsePattern: isRelapsing,
          },
        });
      });
    }
  }

  // Migrasi Habit(GOOD) -> TrackedHabit(BUILD) (Langkah 3.7)
  let goodHabitsProcessedCount = 0;
  let completionEventsCreated = 0;

  for (const habit of goodHabits) {
    const timezone = habit.user.preference?.timezone || "Asia/Jakarta";
    const checkinTime = habit.checkInTime || "20:00";
    const { hour: chHour, minute: chMinute } = parseCheckinTime(checkinTime);

    const startedAt = habit.startDate || habit.createdAt;
    const currentWindowStart = startedAt;
    const nextCheckinAt = nextCheckinAfter(currentWindowStart, timezone, checkinTime);

    const anchorText = habit.cue?.trim() || undefined;
    const tinyBehavior = habit.description?.trim() || habit.title;
    const celebrationText = habit.reward?.trim() || undefined;

    const buildProfileData = {
      anchorText,
      tinyBehavior,
      celebrationText,
      scheduleType: "DAILY" as const,
      daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
      versions: {},
    };

    const eventsToCreate: Array<{
      type: "COMPLETION";
      occurredAt: Date;
      quantity: number;
      source: "BACKFILL";
      mood: number | null;
      note: string | null;
      meta: Record<string, unknown>;
    }> = [];

    const checkinsToCreate: Array<{
      windowStart: Date;
      windowEnd: Date;
      periodDate: Date;
      status: "DONE" | "MISSED";
      mood: number | null;
      note: string | null;
    }> = [];

    for (const log of habit.logs) {
      totalLogsProcessed++;
      const logDateDt = DateTime.fromJSDate(log.date, { zone: timezone }).startOf("day");
      const windowEnd = logDateDt.set({ hour: chHour, minute: chMinute, second: 0, millisecond: 0 });
      const windowStart = windowEnd.minus({ days: 1 });

      if (log.isSuccess) {
        cleanCheckinsCreated++;
        completionEventsCreated++;
        checkinsToCreate.push({
          windowStart: windowStart.toJSDate(),
          windowEnd: windowEnd.toJSDate(),
          periodDate: logDateDt.toJSDate(),
          status: "DONE",
          mood: log.mood,
          note: log.notes,
        });

        const eventTime = windowStart.plus({ hours: 12 });

        eventsToCreate.push({
          type: "COMPLETION",
          occurredAt: eventTime.toJSDate(),
          quantity: 1,
          source: "BACKFILL",
          mood: log.mood,
          note: log.notes,
          meta: {
            legacyLogId: log.id,
          },
        });
      } else {
        checkinsToCreate.push({
          windowStart: windowStart.toJSDate(),
          windowEnd: windowEnd.toJSDate(),
          periodDate: logDateDt.toJSDate(),
          status: "MISSED",
          mood: log.mood,
          note: log.notes,
        });
      }
    }

    const now = new Date();
    const computed = computeStats(
      checkinsToCreate.map((c) => ({
        windowStart: c.windowStart,
        windowEnd: c.windowEnd,
        status: c.status,
      })),
      eventsToCreate.map((e) => ({
        type: e.type,
        occurredAt: e.occurredAt,
        deletedAt: null,
        outcome: null,
        quantity: e.quantity,
      })),
      {
        kind: "BUILD",
        mode: null,
        buildProfile: buildProfileData,
        timezone,
      },
      now,
    );

    const legacyCurrentStreak = habit.streaks.find((s) => s.isCurrent)?.days ?? 0;
    const streakDiff = computed.currentStreakDays - legacyCurrentStreak;

    streakComparisons.push({
      habitId: habit.id,
      title: habit.title,
      kind: "BUILD",
      legacyStreakDays: legacyCurrentStreak,
      newStreakDays: computed.currentStreakDays,
      streakDiff,
      totalLogs: habit.logs.length,
      cleanCheckins: checkinsToCreate.filter((c) => c.status === "DONE").length,
      lapseEvents: 0,
      completionEvents: eventsToCreate.length,
    });

    if (!dryRun) {
      await client.$transaction(async (tx) => {
        const tracked = await tx.trackedHabit.create({
          data: {
            userId: habit.userId,
            name: habit.title,
            kind: "BUILD",
            mode: null,
            status: habit.isActive ? "ACTIVE" : "PAUSED",
            stage: "ACTION",
            timezone,
            checkinLocalTime: checkinTime,
            startedAt,
            currentWindowStart,
            nextCheckinAt,
            privacyLevel: 1,
            buildProfile: {
              create: {
                anchorText: buildProfileData.anchorText,
                tinyBehavior: buildProfileData.tinyBehavior,
                celebrationText: buildProfileData.celebrationText,
                scheduleType: buildProfileData.scheduleType,
                daysOfWeek: buildProfileData.daysOfWeek,
                versions: buildProfileData.versions,
              },
            },
          },
        });

        for (const c of checkinsToCreate) {
          await tx.habitCheckin.upsert({
            where: {
              habitId_periodDate: {
                habitId: tracked.id,
                periodDate: c.periodDate,
              },
            },
            update: {},
            create: {
              habitId: tracked.id,
              windowStart: c.windowStart,
              windowEnd: c.windowEnd,
              periodDate: c.periodDate,
              status: c.status,
              mood: c.mood,
              note: c.note,
            },
          });
        }

        for (const e of eventsToCreate) {
          await tx.habitEvent.create({
            data: {
              habitId: tracked.id,
              userId: habit.userId,
              type: e.type,
              occurredAt: e.occurredAt,
              quantity: e.quantity,
              source: e.source,
              mood: e.mood,
              note: e.note,
              meta: e.meta as Prisma.InputJsonValue,
            },
          });
        }

        await tx.habitStats.create({
          data: {
            habitId: tracked.id,
            currentStreakDays: computed.currentStreakDays,
            longestStreakDays: computed.longestStreakDays,
            confirmedCleanDays: computed.confirmedCleanDays,
            consistency30d: computed.consistency30d,
            resilientStreak: computed.resilientStreak,
            totalLapses: 0,
            urgesResisted: 0,
          },
        });
      });
    }

    goodHabitsProcessedCount++;
  }

  // Ringkasan Laporan
  console.log("\n----------------------------------------------------------");
  console.log("LAPORAN HASIL MIGRASI KEBIASAAN LAMA (JALUR A)");
  console.log("----------------------------------------------------------");
  console.log(`Total Kebiasaan Lama: ${legacyHabits.length}`);
  console.log(`Kebiasaan BAD Diproses: ${badHabits.length}`);
  console.log(`Kebiasaan GOOD Diproses: ${goodHabitsProcessedCount}`);
  console.log(`Total Log Diproses: ${totalLogsProcessed}`);
  console.log(`  - Checkin CLEAN / COMPLETED dibuat: ${cleanCheckinsCreated}`);
  console.log(`  - Event LAPSE dibuat: ${lapseEventsCreated}`);
  console.log(`  - Event COMPLETION dibuat: ${completionEventsCreated}`);
  console.log("\nRingkasan Selisih Streak:");
  for (const s of streakComparisons) {
    const diffSign = s.streakDiff > 0 ? `+${s.streakDiff}` : `${s.streakDiff}`;
    const extraLabel = s.kind === "BUILD" ? `[BUILD]` : `[BREAK]`;
    console.log(
      `  • ${extraLabel} [${s.title}] (ID: ${s.habitId}): Legacy=${s.legacyStreakDays}d -> New=${s.newStreakDays}d (Selisih: ${diffSign}) | Logs: ${s.totalLogs} (${s.cleanCheckins} check-ins, ${s.lapseEvents} lapse, ${s.completionEvents ?? 0} completion)`
    );
  }
  console.log("----------------------------------------------------------\n");

  return {
    mode: "A",
    dryRun,
    totalLegacyHabits: legacyHabits.length,
    badHabitsCount: badHabits.length,
    goodHabitsDeferredCount: 0,
    goodHabitsProcessedCount,
    totalLogsProcessed,
    cleanCheckinsCreated,
    lapseEventsCreated,
    completionEventsCreated,
    streakComparisons,
  };
}

export function parseArgs(argv: string[]): MigrationOptions {
  let mode: "A" | "B" = "A";
  let dryRun = true;

  for (const arg of argv) {
    if (arg === "--mode=B" || arg === "-B") {
      mode = "B";
    } else if (arg === "--mode=A" || arg === "-A") {
      mode = "A";
    } else if (arg === "--execute") {
      dryRun = false;
    } else if (arg === "--dry-run") {
      dryRun = true;
    }
  }

  return { mode, dryRun };
}

if (process.argv[1]?.includes("habits-legacy-migrate")) {
  const options = parseArgs(process.argv.slice(2));
  runHabitsLegacyMigration(options)
    .then(() => {
      console.log("Selesai.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Gagal menjalankan migrasi:", err);
      process.exit(1);
    });
}
