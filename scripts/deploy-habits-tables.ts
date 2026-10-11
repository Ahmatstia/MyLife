import { Client } from "pg";
import "dotenv/config";

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DIRECT_URL atau DATABASE_URL tidak ditemukan di .env");
  }

  console.log("[deploy-habits] Menghubungkan ke database...");
  const client = new Client({ connectionString });
  await client.connect();

  const ddlStatements = [
    // 1. Enums
    `DO $$ BEGIN
      CREATE TYPE "HabitKind" AS ENUM ('BREAK', 'BUILD');
    EXCEPTION WHEN duplicate_object THEN null; END $$;`,

    `DO $$ BEGIN
      CREATE TYPE "HabitMode" AS ENUM ('ABSTAIN', 'REDUCE');
    EXCEPTION WHEN duplicate_object THEN null; END $$;`,

    `DO $$ BEGIN
      CREATE TYPE "HabitScheduleType" AS ENUM ('DAILY', 'DAYS_OF_WEEK', 'TIMES_PER_WEEK');
    EXCEPTION WHEN duplicate_object THEN null; END $$;`,

    `DO $$ BEGIN
      CREATE TYPE "HabitStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;`,

    `DO $$ BEGIN
      CREATE TYPE "HabitStage" AS ENUM ('CONTEMPLATION', 'PREPARATION', 'ACTION', 'MAINTENANCE');
    EXCEPTION WHEN duplicate_object THEN null; END $$;`,

    `DO $$ BEGIN
      CREATE TYPE "HabitEventType" AS ENUM ('URGE', 'LAPSE', 'OCCURRENCE', 'COMPLETION', 'SKIP');
    EXCEPTION WHEN duplicate_object THEN null; END $$;`,

    `DO $$ BEGIN
      CREATE TYPE "HabitCheckinStatus" AS ENUM ('PENDING', 'CLEAN', 'LAPSED', 'WITHIN_LIMIT', 'OVER_LIMIT', 'DONE', 'SKIPPED', 'MISSED', 'UNCONFIRMED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;`,

    `DO $$ BEGIN
      CREATE TYPE "TriggerCategory" AS ENUM ('TIME', 'PLACE', 'PERSON', 'EMOTION', 'PHYSICAL', 'ACTIVITY', 'DEVICE', 'OTHER');
    EXCEPTION WHEN duplicate_object THEN null; END $$;`,

    `DO $$ BEGIN
      ALTER TYPE "NotificationType" ADD VALUE 'HABIT_CHECKIN';
    EXCEPTION WHEN duplicate_object THEN null; END $$;`,

    // 2. Tables
    `CREATE TABLE IF NOT EXISTS "TrackedHabit" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "areaId" TEXT REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      "kind" "HabitKind" NOT NULL,
      "mode" "HabitMode",
      "name" TEXT NOT NULL,
      "displayAlias" TEXT,
      "category" TEXT,
      "status" "HabitStatus" NOT NULL DEFAULT 'ACTIVE',
      "stage" "HabitStage" NOT NULL DEFAULT 'PREPARATION',
      "identityStatement" TEXT,
      "timezone" TEXT NOT NULL,
      "checkinLocalTime" TEXT NOT NULL,
      "startedAt" TIMESTAMPTZ(3) NOT NULL,
      "currentWindowStart" TIMESTAMPTZ(3) NOT NULL,
      "nextCheckinAt" TIMESTAMPTZ(3),
      "privacyLevel" INTEGER NOT NULL DEFAULT 1,
      "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMPTZ(3) NOT NULL,
      "archivedAt" TIMESTAMPTZ(3)
    );`,

    `CREATE TABLE IF NOT EXISTS "HabitBreakProfile" (
      "habitId" TEXT NOT NULL PRIMARY KEY REFERENCES "TrackedHabit"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "whyReasons" JSONB NOT NULL DEFAULT '[]',
      "futureSelfNote" TEXT,
      "rewardAnalysis" JSONB NOT NULL DEFAULT '{}',
      "baselinePerDay" DECIMAL(8,2),
      "costPerOccurrence" DECIMAL(12,2),
      "currency" TEXT NOT NULL DEFAULT 'IDR',
      "minutesPerOccurrence" INTEGER,
      "reduceDailyLimit" INTEGER,
      "reduceStepPercent" INTEGER,
      "reduceStepEveryDays" INTEGER,
      "relapseLapseCount" INTEGER NOT NULL DEFAULT 3,
      "relapseWindowDays" INTEGER NOT NULL DEFAULT 7,
      "highRiskCategory" BOOLEAN NOT NULL DEFAULT false,
      "safetyAckAt" TIMESTAMPTZ(3),
      "relapseAckAt" TIMESTAMPTZ(3),
      "environmentChecklist" JSONB NOT NULL DEFAULT '[]'
    );`,

    `CREATE TABLE IF NOT EXISTS "HabitEvent" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "habitId" TEXT NOT NULL REFERENCES "TrackedHabit"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "type" "HabitEventType" NOT NULL,
      "occurredAt" TIMESTAMPTZ(3) NOT NULL,
      "loggedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "quantity" DECIMAL(8,2) NOT NULL DEFAULT 1,
      "intensityBefore" INTEGER,
      "intensityAfter" INTEGER,
      "outcome" TEXT,
      "severity" TEXT,
      "mood" INTEGER,
      "halt" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "locationLabel" TEXT,
      "withWhom" TEXT,
      "note" TEXT,
      "meta" JSONB NOT NULL DEFAULT '{}',
      "source" TEXT NOT NULL DEFAULT 'APP',
      "idempotencyKey" TEXT,
      "deletedAt" TIMESTAMPTZ(3)
    );`,

    `CREATE TABLE IF NOT EXISTS "HabitCheckin" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "habitId" TEXT NOT NULL REFERENCES "TrackedHabit"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "windowStart" TIMESTAMPTZ(3) NOT NULL,
      "windowEnd" TIMESTAMPTZ(3) NOT NULL,
      "periodDate" DATE NOT NULL,
      "status" "HabitCheckinStatus" NOT NULL DEFAULT 'PENDING',
      "quantity" DECIMAL(8,2),
      "mood" INTEGER,
      "note" TEXT,
      "notifiedAt" TIMESTAMPTZ(3),
      "respondedAt" TIMESTAMPTZ(3),
      "responseSource" TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS "HabitStats" (
      "habitId" TEXT NOT NULL PRIMARY KEY REFERENCES "TrackedHabit"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "lastLapseAt" TIMESTAMPTZ(3),
      "currentStreakDays" INTEGER NOT NULL DEFAULT 0,
      "longestStreakDays" INTEGER NOT NULL DEFAULT 0,
      "confirmedCleanDays" INTEGER NOT NULL DEFAULT 0,
      "totalLapses" INTEGER NOT NULL DEFAULT 0,
      "urgesResisted" INTEGER NOT NULL DEFAULT 0,
      "cleanRate30d" DECIMAL(5,2),
      "consistency30d" DECIMAL(5,2),
      "resilientStreak" INTEGER NOT NULL DEFAULT 0,
      "moneySavedEst" DECIMAL(14,2),
      "minutesSavedEst" INTEGER,
      "relapsePattern" BOOLEAN NOT NULL DEFAULT false,
      "recomputedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS "HabitNotificationOutbox" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "habitId" TEXT REFERENCES "TrackedHabit"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "kind" TEXT NOT NULL,
      "payload" JSONB NOT NULL,
      "scheduledAt" TIMESTAMPTZ(3) NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "attempts" INTEGER NOT NULL DEFAULT 0,
      "dedupeKey" TEXT NOT NULL UNIQUE,
      "lastError" TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS "Trigger" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "category" "TriggerCategory" NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMPTZ(3) NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS "HabitTrigger" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "habitId" TEXT NOT NULL REFERENCES "TrackedHabit"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "triggerId" TEXT NOT NULL REFERENCES "Trigger"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "intensity" INTEGER NOT NULL DEFAULT 3,
      "note" TEXT,
      "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMPTZ(3) NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS "CopingPlan" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "habitId" TEXT NOT NULL REFERENCES "TrackedHabit"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "habitTriggerId" TEXT REFERENCES "HabitTrigger"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      "ifCondition" TEXT NOT NULL,
      "thenAction" TEXT NOT NULL,
      "replacementHabitId" TEXT,
      "timesUsed" INTEGER NOT NULL DEFAULT 0,
      "timesHelped" INTEGER NOT NULL DEFAULT 0,
      "order" INTEGER NOT NULL DEFAULT 0,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMPTZ(3) NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS "HabitEventTrigger" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "eventId" TEXT NOT NULL REFERENCES "HabitEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "habitTriggerId" TEXT NOT NULL REFERENCES "HabitTrigger"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS "HabitMilestone" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "habitId" TEXT NOT NULL REFERENCES "TrackedHabit"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "code" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "achievedAt" TIMESTAMPTZ(3) NOT NULL,
      "celebratedAt" TIMESTAMPTZ(3),
      "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS "SupportResource" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "country" TEXT NOT NULL DEFAULT 'ID',
      "category" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "contact" TEXT NOT NULL,
      "description" TEXT,
      "isVerified" BOOLEAN NOT NULL DEFAULT true,
      "verifiedAt" TIMESTAMPTZ(3) NOT NULL,
      "sourceUrl" TEXT,
      "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMPTZ(3) NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS "HabitBuildProfile" (
      "habitId" TEXT NOT NULL PRIMARY KEY REFERENCES "TrackedHabit"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "anchorText" TEXT,
      "tinyBehavior" TEXT NOT NULL,
      "celebrationText" TEXT,
      "versions" JSONB NOT NULL DEFAULT '{}',
      "scheduleType" "HabitScheduleType" NOT NULL DEFAULT 'DAILY',
      "daysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
      "timesPerWeek" INTEGER,
      "restDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
      "replacesHabitId" TEXT REFERENCES "TrackedHabit"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMPTZ(3) NOT NULL
    );`,

    `CREATE TABLE IF NOT EXISTS "AutomaticitySurvey" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "habitId" TEXT NOT NULL REFERENCES "TrackedHabit"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "answeredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "score" INTEGER NOT NULL,
      "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,

    // 3. Unique & Partial Indexes
    `CREATE INDEX IF NOT EXISTS "TrackedHabit_userId_status_idx" ON "TrackedHabit"("userId", "status");`,
    `CREATE INDEX IF NOT EXISTS "HabitEvent_habitId_occurredAt_idx" ON "HabitEvent"("habitId", "occurredAt" DESC);`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "HabitEvent_userId_idempotencyKey_key" ON "HabitEvent"("userId", "idempotencyKey");`,
    `CREATE INDEX IF NOT EXISTS "HabitCheckin_habitId_windowEnd_idx" ON "HabitCheckin"("habitId", "windowEnd" DESC);`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "HabitCheckin_habitId_periodDate_key" ON "HabitCheckin"("habitId", "periodDate");`,
    `CREATE INDEX IF NOT EXISTS "HabitNotificationOutbox_status_scheduledAt_idx" ON "HabitNotificationOutbox"("status", "scheduledAt");`,
    `CREATE INDEX IF NOT EXISTS "Trigger_userId_category_idx" ON "Trigger"("userId", "category");`,
    `CREATE INDEX IF NOT EXISTS "HabitTrigger_habitId_idx" ON "HabitTrigger"("habitId");`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "HabitTrigger_habitId_triggerId_key" ON "HabitTrigger"("habitId", "triggerId");`,
    `CREATE INDEX IF NOT EXISTS "CopingPlan_habitId_isActive_idx" ON "CopingPlan"("habitId", "isActive");`,
    `CREATE INDEX IF NOT EXISTS "CopingPlan_habitTriggerId_idx" ON "CopingPlan"("habitTriggerId");`,
    `CREATE INDEX IF NOT EXISTS "HabitEventTrigger_eventId_idx" ON "HabitEventTrigger"("eventId");`,
    `CREATE INDEX IF NOT EXISTS "HabitEventTrigger_habitTriggerId_idx" ON "HabitEventTrigger"("habitTriggerId");`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "HabitEventTrigger_eventId_habitTriggerId_key" ON "HabitEventTrigger"("eventId", "habitTriggerId");`,
    `CREATE INDEX IF NOT EXISTS "HabitMilestone_habitId_achievedAt_idx" ON "HabitMilestone"("habitId", "achievedAt");`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "HabitMilestone_habitId_code_key" ON "HabitMilestone"("habitId", "code");`,
    `CREATE INDEX IF NOT EXISTS "SupportResource_country_category_idx" ON "SupportResource"("country", "category");`,
    `CREATE INDEX IF NOT EXISTS "HabitBuildProfile_replacesHabitId_idx" ON "HabitBuildProfile"("replacesHabitId");`,
    `CREATE INDEX IF NOT EXISTS "AutomaticitySurvey_habitId_answeredAt_idx" ON "AutomaticitySurvey"("habitId", "answeredAt");`,
    `CREATE INDEX IF NOT EXISTS idx_th_due ON "TrackedHabit" ("nextCheckinAt") WHERE status = 'ACTIVE';`,
    `CREATE INDEX IF NOT EXISTS idx_he_habit_time ON "HabitEvent" ("habitId", "occurredAt" DESC) WHERE "deletedAt" IS NULL;`,
    `CREATE INDEX IF NOT EXISTS idx_hc_pending ON "HabitCheckin" ("habitId", "windowEnd" DESC) WHERE status = 'PENDING';`,
    `CREATE INDEX IF NOT EXISTS idx_hob_pending ON "HabitNotificationOutbox" ("scheduledAt") WHERE status = 'PENDING';`,
    `CREATE INDEX IF NOT EXISTS idx_trigger_builtin ON "Trigger" ("category") WHERE "userId" IS NULL;`,

    // 4. Custom CHECK Constraints
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_th_kind_mode') THEN
        ALTER TABLE "TrackedHabit" ADD CONSTRAINT chk_th_kind_mode
          CHECK ((kind = 'BREAK' AND mode IS NOT NULL) OR (kind = 'BUILD' AND mode IS NULL));
      END IF;
    END $$;`,

    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_th_checkin_time') THEN
        ALTER TABLE "TrackedHabit" ADD CONSTRAINT chk_th_checkin_time
          CHECK ("checkinLocalTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
      END IF;
    END $$;`,

    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_th_privacy') THEN
        ALTER TABLE "TrackedHabit" ADD CONSTRAINT chk_th_privacy CHECK ("privacyLevel" BETWEEN 0 AND 2);
      END IF;
    END $$;`,

    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_he_qty') THEN
        ALTER TABLE "HabitEvent" ADD CONSTRAINT chk_he_qty CHECK (quantity > 0);
      END IF;
    END $$;`,

    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_he_intensity') THEN
        ALTER TABLE "HabitEvent" ADD CONSTRAINT chk_he_intensity CHECK (
          ("intensityBefore" IS NULL OR "intensityBefore" BETWEEN 0 AND 10) AND
          ("intensityAfter"  IS NULL OR "intensityAfter"  BETWEEN 0 AND 10));
      END IF;
    END $$;`,

    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_he_mood') THEN
        ALTER TABLE "HabitEvent" ADD CONSTRAINT chk_he_mood CHECK (mood IS NULL OR mood BETWEEN 1 AND 5);
      END IF;
    END $$;`,

    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_he_outcome') THEN
        ALTER TABLE "HabitEvent" ADD CONSTRAINT chk_he_outcome CHECK (outcome IS NULL OR outcome IN ('RESISTED','GAVE_IN'));
      END IF;
    END $$;`,

    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_he_severity') THEN
        ALTER TABLE "HabitEvent" ADD CONSTRAINT chk_he_severity CHECK (severity IS NULL OR severity IN ('SLIP','RELAPSE'));
      END IF;
    END $$;`,

    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_hc_window') THEN
        ALTER TABLE "HabitCheckin" ADD CONSTRAINT chk_hc_window CHECK ("windowEnd" > "windowStart");
      END IF;
    END $$;`,

    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ht_intensity') THEN
        ALTER TABLE "HabitTrigger" ADD CONSTRAINT chk_ht_intensity CHECK (intensity BETWEEN 1 AND 5);
      END IF;
    END $$;`,

    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_cp_times') THEN
        ALTER TABLE "CopingPlan" ADD CONSTRAINT chk_cp_times CHECK ("timesUsed" >= 0 AND "timesHelped" >= 0 AND "timesHelped" <= "timesUsed");
      END IF;
    END $$;`,

    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_hbp_schedule_type') THEN
        ALTER TABLE "HabitBuildProfile" ADD CONSTRAINT chk_hbp_schedule_type
          CHECK ("scheduleType"::text IN ('DAILY', 'DAYS_OF_WEEK', 'TIMES_PER_WEEK'));
      END IF;
    END $$;`,

    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_hbp_times_per_week') THEN
        ALTER TABLE "HabitBuildProfile" ADD CONSTRAINT chk_hbp_times_per_week
          CHECK ("timesPerWeek" IS NULL OR ("timesPerWeek" BETWEEN 1 AND 7));
      END IF;
    END $$;`,

    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_as_score') THEN
        ALTER TABLE "AutomaticitySurvey" ADD CONSTRAINT chk_as_score
          CHECK (score BETWEEN 1 AND 7);
      END IF;
    END $$;`
  ];

  console.log(`[deploy-habits] Menerapkan ${ddlStatements.length} statement DDL...`);
  for (let i = 0; i < ddlStatements.length; i++) {
    try {
      await client.query(ddlStatements[i]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("already exists") && !msg.includes("duplicate")) {
        console.warn(`[deploy-habits] Peringatan statement ${i + 1}: ${msg}`);
      }
    }
  }

  await client.end();
  console.log("[deploy-habits] ✓ Seluruh tabel, relasi, dan constraints Habits v2 berhasil diterapkan ke database Supabase!");
}

main().catch((err) => {
  console.error("[deploy-habits] Error:", err);
  process.exit(1);
});
