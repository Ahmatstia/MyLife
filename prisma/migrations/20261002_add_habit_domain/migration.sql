-- CreateEnum
CREATE TYPE "HabitType" AS ENUM ('GOOD', 'BAD');

-- CreateEnum
CREATE TYPE "HabitDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'EXTREME');

-- CreateTable
CREATE TABLE "Habit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "HabitType" NOT NULL DEFAULT 'GOOD',
    "difficulty" "HabitDifficulty" NOT NULL DEFAULT 'MEDIUM',
    "color" TEXT NOT NULL DEFAULT '#8B5CF6',
    "icon" TEXT NOT NULL DEFAULT 'zap',
    "areaId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "triggerNotes" TEXT,
    "replacementHabit" TEXT,
    "whyQuit" TEXT,
    "cue" TEXT,
    "reward" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitPhase" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetDays" INTEGER NOT NULL,
    "afterRelapseDays" INTEGER,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "psychTip" TEXT,

    CONSTRAINT "HabitPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isSuccess" BOOLEAN NOT NULL DEFAULT true,
    "mood" INTEGER,
    "energyLevel" INTEGER,
    "notes" TEXT,
    "relapseTrigger" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HabitLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitStreak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "days" INTEGER NOT NULL DEFAULT 0,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "HabitStreak_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Habit_userId_type_idx" ON "Habit"("userId", "type");

-- CreateIndex
CREATE INDEX "Habit_userId_isActive_idx" ON "Habit"("userId", "isActive");

-- CreateIndex
CREATE INDEX "Habit_userId_areaId_idx" ON "Habit"("userId", "areaId");

-- CreateIndex
CREATE INDEX "HabitPhase_habitId_order_idx" ON "HabitPhase"("habitId", "order");

-- CreateIndex
CREATE INDEX "HabitPhase_habitId_isCompleted_idx" ON "HabitPhase"("habitId", "isCompleted");

-- CreateIndex
CREATE UNIQUE INDEX "HabitLog_userId_habitId_date_key" ON "HabitLog"("userId", "habitId", "date");

-- CreateIndex
CREATE INDEX "HabitLog_userId_habitId_idx" ON "HabitLog"("userId", "habitId");

-- CreateIndex
CREATE INDEX "HabitLog_userId_date_idx" ON "HabitLog"("userId", "date");

-- CreateIndex
CREATE INDEX "HabitLog_habitId_date_idx" ON "HabitLog"("habitId", "date");

-- CreateIndex
CREATE INDEX "HabitStreak_userId_habitId_isCurrent_idx" ON "HabitStreak"("userId", "habitId", "isCurrent");

-- CreateIndex
CREATE INDEX "HabitStreak_habitId_isCurrent_idx" ON "HabitStreak"("habitId", "isCurrent");

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitPhase" ADD CONSTRAINT "HabitPhase_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitLog" ADD CONSTRAINT "HabitLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitLog" ADD CONSTRAINT "HabitLog_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitStreak" ADD CONSTRAINT "HabitStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitStreak" ADD CONSTRAINT "HabitStreak_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
