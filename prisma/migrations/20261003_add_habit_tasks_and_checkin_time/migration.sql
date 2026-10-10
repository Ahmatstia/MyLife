-- AlterTable
ALTER TABLE "Habit" ADD COLUMN IF NOT EXISTS "checkInTime" TEXT NOT NULL DEFAULT '06:00';
ALTER TABLE "Habit" ADD COLUMN IF NOT EXISTS "targetDays" INTEGER;

-- CreateTable
CREATE TABLE IF NOT EXISTS "HabitTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT NOT NULL DEFAULT 'ACTION',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HabitTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "HabitTask_habitId_order_idx" ON "HabitTask"("habitId", "order");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "HabitTask_userId_habitId_idx" ON "HabitTask"("userId", "habitId");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'HabitTask_userId_fkey'
    ) THEN
        ALTER TABLE "HabitTask" ADD CONSTRAINT "HabitTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'HabitTask_habitId_fkey'
    ) THEN
        ALTER TABLE "HabitTask" ADD CONSTRAINT "HabitTask_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
