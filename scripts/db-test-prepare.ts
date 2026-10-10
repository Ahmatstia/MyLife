import { spawnSync } from "node:child_process";
import { Client } from "pg";
import "dotenv/config";
import { assertSafeTestDatabaseUrl, sanitizeDatabaseUrl } from "../tests/support/db-guard";

async function applyHabitsConstraints(testUrl: string) {
  console.log("[db:test:prepare] Menerapkan custom CHECK constraints dan partial indexes...");
  const client = new Client({ connectionString: testUrl });
  await client.connect();

  const constraintsSql = `
    -- 1. chk_th_kind_mode
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_th_kind_mode') THEN
        ALTER TABLE "TrackedHabit" ADD CONSTRAINT chk_th_kind_mode
          CHECK ((kind = 'BREAK' AND mode IS NOT NULL) OR (kind = 'BUILD' AND mode IS NULL));
      END IF;
    END $$;

    -- 2. chk_th_checkin_time
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_th_checkin_time') THEN
        ALTER TABLE "TrackedHabit" ADD CONSTRAINT chk_th_checkin_time
          CHECK ("checkinLocalTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
      END IF;
    END $$;

    -- 3. chk_th_privacy
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_th_privacy') THEN
        ALTER TABLE "TrackedHabit" ADD CONSTRAINT chk_th_privacy CHECK ("privacyLevel" BETWEEN 0 AND 2);
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS idx_th_due ON "TrackedHabit" ("nextCheckinAt") WHERE status = 'ACTIVE';

    -- 4. chk_he_qty
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_he_qty') THEN
        ALTER TABLE "HabitEvent" ADD CONSTRAINT chk_he_qty CHECK (quantity > 0);
      END IF;
    END $$;

    -- 5. chk_he_intensity
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_he_intensity') THEN
        ALTER TABLE "HabitEvent" ADD CONSTRAINT chk_he_intensity CHECK (
          ("intensityBefore" IS NULL OR "intensityBefore" BETWEEN 0 AND 10) AND
          ("intensityAfter"  IS NULL OR "intensityAfter"  BETWEEN 0 AND 10));
      END IF;
    END $$;

    -- 6. chk_he_mood
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_he_mood') THEN
        ALTER TABLE "HabitEvent" ADD CONSTRAINT chk_he_mood CHECK (mood IS NULL OR mood BETWEEN 1 AND 5);
      END IF;
    END $$;

    -- 7. chk_he_outcome
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_he_outcome') THEN
        ALTER TABLE "HabitEvent" ADD CONSTRAINT chk_he_outcome CHECK (outcome IS NULL OR outcome IN ('RESISTED','GAVE_IN'));
      END IF;
    END $$;

    -- 8. chk_he_severity
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_he_severity') THEN
        ALTER TABLE "HabitEvent" ADD CONSTRAINT chk_he_severity CHECK (severity IS NULL OR severity IN ('SLIP','RELAPSE'));
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS idx_he_habit_time ON "HabitEvent" ("habitId", "occurredAt" DESC) WHERE "deletedAt" IS NULL;

    -- 9. chk_hc_window
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_hc_window') THEN
        ALTER TABLE "HabitCheckin" ADD CONSTRAINT chk_hc_window CHECK ("windowEnd" > "windowStart");
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS idx_hc_pending ON "HabitCheckin" ("habitId", "windowEnd" DESC) WHERE status = 'PENDING';

    CREATE INDEX IF NOT EXISTS idx_hob_pending ON "HabitNotificationOutbox" ("scheduledAt") WHERE status = 'PENDING';

    -- 10. chk_ht_intensity
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ht_intensity') THEN
        ALTER TABLE "HabitTrigger" ADD CONSTRAINT chk_ht_intensity CHECK (intensity BETWEEN 1 AND 5);
      END IF;
    END $$;

    -- 11. chk_cp_times
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_cp_times') THEN
        ALTER TABLE "CopingPlan" ADD CONSTRAINT chk_cp_times CHECK ("timesUsed" >= 0 AND "timesHelped" >= 0 AND "timesHelped" <= "timesUsed");
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS idx_trigger_builtin ON "Trigger" ("category") WHERE "userId" IS NULL;
  `;

  await client.query(constraintsSql);
  await client.query("ALTER TYPE \"NotificationType\" ADD VALUE IF NOT EXISTS 'HABIT_CHECKIN';");
  await client.end();
  console.log("[db:test:prepare] ✓ Custom CHECK constraints, enum values, dan partial indexes berhasil diterapkan.");
}

async function main() {
  const testUrl = process.env.TEST_DATABASE_URL?.trim();

  // 1. Validasi TEST_DATABASE_URL dengan guard murni
  assertSafeTestDatabaseUrl(testUrl, process.env);

  console.log(
    `[db:test:prepare] Memvalidasi & menyiapkan skema database pengujian pada: ${sanitizeDatabaseUrl(testUrl)}`,
  );

  // 2. Jalankan migrasi/skema dengan DATABASE_URL = TEST_DATABASE_URL HANYA untuk proses anak
  const childEnv = {
    ...process.env,
    DATABASE_URL: testUrl,
    DIRECT_URL: testUrl,
  };

  const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";

  // Coba prisma migrate deploy terlebih dahulu
  console.log("[db:test:prepare] Menjalankan prisma migrate deploy...");
  const migrateResult = spawnSync(npxCmd, ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: childEnv,
    shell: true,
  });

  if (migrateResult.status !== 0) {
    console.warn(
      "\n[db:test:prepare] PERINGATAN: `prisma migrate deploy` gagal karena riwayat migrasi awal berisi sintaks SQLite (Temuan 1.1c).",
    );
    console.log(
      "[db:test:prepare] Menggunakan fallback DDL dari `prisma migrate diff` untuk sinkronisasi skema penuh ke database pengujian...",
    );

    const diffResult = spawnSync(
      npxCmd,
      [
        "prisma",
        "migrate",
        "diff",
        "--from-config-datasource",
        "--to-schema",
        "prisma/schema.prisma",
        "--script",
      ],
      {
        encoding: "utf-8",
        env: childEnv,
        shell: true,
      },
    );

    if (diffResult.status !== 0 || !diffResult.stdout) {
      console.error(
        `[db:test:prepare] prisma migrate diff gagal: ${diffResult.stderr || "tidak ada output"}`,
      );
      process.exit(diffResult.status ?? 1);
    }

    const client = new Client({ connectionString: testUrl });
    await client.connect();
    try {
      // Eksekusi statement demi statement agar error 'already exists' tidak menghentikan statement lainnya
      const statements = diffResult.stdout
        .split(/;\s*[\r\n]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const sql of statements) {
        try {
          await client.query(sql);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!msg.includes("already exists") && !msg.includes("duplicate")) {
            console.warn(`[db:test:prepare] Peringatan DDL: ${msg}`);
          }
        }
      }
      console.log("[db:test:prepare] ✓ Sinkronisasi DDL berhasil diterapkan ke database pengujian.");
    } finally {
      await client.end();
    }
  }

  // Terapkan custom constraints & partial indexes
  await applyHabitsConstraints(testUrl!);

  // Terapkan juga constraints aplikasi lama jika ada
  console.log("[db:test:prepare] Menjalankan scripts/setup-db-constraints.ts...");
  const constraintsResult = spawnSync(
    npxCmd,
    ["tsx", "scripts/setup-db-constraints.ts"],
    {
      stdio: "inherit",
      env: childEnv,
      shell: true,
    },
  );

  if (constraintsResult.status !== 0) {
    console.error(
      `[db:test:prepare] scripts/setup-db-constraints.ts gagal dengan status ${constraintsResult.status}.`,
    );
    process.exit(constraintsResult.status ?? 1);
  }

  console.log("\n[db:test:prepare] Database pengujian siap digunakan untuk pengujian.");
}

main().catch((err: unknown) => {
  if (err instanceof Error) {
    console.error(err.message);
  } else {
    console.error(err);
  }
  process.exit(1);
});
