import { spawnSync } from "node:child_process";
import "dotenv/config";
import { assertSafeTestDatabaseUrl, sanitizeDatabaseUrl } from "../tests/support/db-guard";

async function main() {
  const testUrl = process.env.TEST_DATABASE_URL?.trim();

  // 1. Validasi TEST_DATABASE_URL dengan guard murni
  assertSafeTestDatabaseUrl(testUrl, process.env);

  console.log(
    `[db:test:prepare] Memvalidasi & menyiapkan skema database pengujian pada: ${sanitizeDatabaseUrl(testUrl)}`,
  );

  // 2. Jalankan prisma migrate deploy dengan DATABASE_URL = TEST_DATABASE_URL HANYA untuk proses anak
  // Menyediakan DIRECT_URL juga untuk Prisma jika skema mengonfigurasikannya
  const childEnv = {
    ...process.env,
    DATABASE_URL: testUrl,
    DIRECT_URL: testUrl,
  };

  const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(npxCmd, ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: childEnv,
    shell: true,
  });

  if (result.status !== 0) {
    console.error(
      `[db:test:prepare] prisma migrate deploy gagal dengan status ${result.status}.`,
    );
    process.exit(result.status ?? 1);
  }

  console.log("[db:test:prepare] Skema database pengujian berhasil disiapkan.");
}

main().catch((err: unknown) => {
  if (err instanceof Error) {
    console.error(err.message);
  } else {
    console.error(err);
  }
  process.exit(1);
});
