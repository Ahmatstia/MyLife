-- CreateEnum
CREATE TYPE "HabitKind" AS ENUM ('BREAK', 'BUILD');

-- CreateEnum
CREATE TYPE "HabitMode" AS ENUM ('ABSTAIN', 'REDUCE');

-- CreateEnum
CREATE TYPE "HabitStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "HabitStage" AS ENUM ('CONTEMPLATION', 'PREPARATION', 'ACTION', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "HabitEventType" AS ENUM ('URGE', 'LAPSE', 'OCCURRENCE', 'COMPLETION', 'SKIP');

-- CreateEnum
CREATE TYPE "HabitCheckinStatus" AS ENUM ('PENDING', 'CLEAN', 'LAPSED', 'WITHIN_LIMIT', 'OVER_LIMIT', 'DONE', 'SKIPPED', 'MISSED', 'UNCONFIRMED');

-- CreateTable
CREATE TABLE "TrackedHabit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "areaId" TEXT,
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
    "archivedAt" TIMESTAMPTZ(3),

    CONSTRAINT "TrackedHabit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitBreakProfile" (
    "habitId" TEXT NOT NULL,
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
    "environmentChecklist" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "HabitBreakProfile_pkey" PRIMARY KEY ("habitId")
);

-- CreateTable
CREATE TABLE "HabitEvent" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
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
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "HabitEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitCheckin" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "windowStart" TIMESTAMPTZ(3) NOT NULL,
    "windowEnd" TIMESTAMPTZ(3) NOT NULL,
    "periodDate" DATE NOT NULL,
    "status" "HabitCheckinStatus" NOT NULL DEFAULT 'PENDING',
    "quantity" DECIMAL(8,2),
    "mood" INTEGER,
    "note" TEXT,
    "notifiedAt" TIMESTAMPTZ(3),
    "respondedAt" TIMESTAMPTZ(3),
    "responseSource" TEXT,

    CONSTRAINT "HabitCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitStats" (
    "habitId" TEXT NOT NULL,
    "lastLapseAt" TIMESTAMPTZ(3),
    "currentStreakDays" INTEGER NOT NULL DEFAULT 0,
    "longestStreakDays" INTEGER NOT NULL DEFAULT 0,
    "confirmedCleanDays" INTEGER NOT NULL DEFAULT 0,
    "totalLapses" INTEGER NOT NULL DEFAULT 0,
    "urgesResisted" INTEGER NOT NULL DEFAULT 0,
    "cleanRate30d" DECIMAL(5,2),
    "relapsePattern" BOOLEAN NOT NULL DEFAULT false,
    "recomputedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HabitStats_pkey" PRIMARY KEY ("habitId")
);

-- CreateTable
CREATE TABLE "HabitNotificationOutbox" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "habitId" TEXT,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "scheduledAt" TIMESTAMPTZ(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "dedupeKey" TEXT NOT NULL,
    "lastError" TEXT,

    CONSTRAINT "HabitNotificationOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrackedHabit_userId_status_idx" ON "TrackedHabit"("userId", "status");

-- CreateIndex
CREATE INDEX "HabitEvent_habitId_occurredAt_idx" ON "HabitEvent"("habitId", "occurredAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "HabitEvent_userId_idempotencyKey_key" ON "HabitEvent"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "HabitCheckin_habitId_windowEnd_idx" ON "HabitCheckin"("habitId", "windowEnd" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "HabitCheckin_habitId_periodDate_key" ON "HabitCheckin"("habitId", "periodDate");

-- CreateIndex
CREATE UNIQUE INDEX "HabitNotificationOutbox_dedupeKey_key" ON "HabitNotificationOutbox"("dedupeKey");

-- CreateIndex
CREATE INDEX "HabitNotificationOutbox_status_scheduledAt_idx" ON "HabitNotificationOutbox"("status", "scheduledAt");

-- AddForeignKey
ALTER TABLE "TrackedHabit" ADD CONSTRAINT "TrackedHabit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackedHabit" ADD CONSTRAINT "TrackedHabit_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitBreakProfile" ADD CONSTRAINT "HabitBreakProfile_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "TrackedHabit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitEvent" ADD CONSTRAINT "HabitEvent_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "TrackedHabit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitEvent" ADD CONSTRAINT "HabitEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitCheckin" ADD CONSTRAINT "HabitCheckin_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "TrackedHabit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitStats" ADD CONSTRAINT "HabitStats_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "TrackedHabit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitNotificationOutbox" ADD CONSTRAINT "HabitNotificationOutbox_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitNotificationOutbox" ADD CONSTRAINT "HabitNotificationOutbox_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "TrackedHabit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Custom CHECK Constraints and Partial Indexes (Habits v2 Phase 1)
ALTER TABLE "TrackedHabit" ADD CONSTRAINT chk_th_kind_mode
  CHECK ((kind = 'BREAK' AND mode IS NOT NULL) OR (kind = 'BUILD' AND mode IS NULL));
ALTER TABLE "TrackedHabit" ADD CONSTRAINT chk_th_checkin_time
  CHECK ("checkinLocalTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
ALTER TABLE "TrackedHabit" ADD CONSTRAINT chk_th_privacy CHECK ("privacyLevel" BETWEEN 0 AND 2);
CREATE INDEX idx_th_due ON "TrackedHabit" ("nextCheckinAt") WHERE status = 'ACTIVE';

ALTER TABLE "HabitEvent" ADD CONSTRAINT chk_he_qty       CHECK (quantity > 0);
ALTER TABLE "HabitEvent" ADD CONSTRAINT chk_he_intensity CHECK (
  ("intensityBefore" IS NULL OR "intensityBefore" BETWEEN 0 AND 10) AND
  ("intensityAfter"  IS NULL OR "intensityAfter"  BETWEEN 0 AND 10));
ALTER TABLE "HabitEvent" ADD CONSTRAINT chk_he_mood CHECK (mood IS NULL OR mood BETWEEN 1 AND 5);
ALTER TABLE "HabitEvent" ADD CONSTRAINT chk_he_outcome  CHECK (outcome  IS NULL OR outcome  IN ('RESISTED','GAVE_IN'));
ALTER TABLE "HabitEvent" ADD CONSTRAINT chk_he_severity CHECK (severity IS NULL OR severity IN ('SLIP','RELAPSE'));
CREATE INDEX idx_he_habit_time ON "HabitEvent" ("habitId", "occurredAt" DESC) WHERE "deletedAt" IS NULL;

ALTER TABLE "HabitCheckin" ADD CONSTRAINT chk_hc_window CHECK ("windowEnd" > "windowStart");
CREATE INDEX idx_hc_pending ON "HabitCheckin" ("habitId", "windowEnd" DESC) WHERE status = 'PENDING';

CREATE INDEX idx_hob_pending ON "HabitNotificationOutbox" ("scheduledAt") WHERE status = 'PENDING';
