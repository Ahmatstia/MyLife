import "dotenv/config";
import { expect } from "vitest";
import { assertSafeTestDatabaseUrl } from "./db-guard";

/**
 * Setup hook yang dijalankan Vitest di setiap worker thread sebelum file test di-load.
 * Menegakkan aturan:
 * 1. process.env.DATABASE_URL tidak boleh jatuh ke database remote/aplikasi (.env asli).
 * 2. Jika TEST_DATABASE_URL tersedia, divalidasi dengan assertSafeTestDatabaseUrl lalu dipasang ke DATABASE_URL & DIRECT_URL.
 * 3. Tes murni (tests/habits/* dan tests/support/*) tidak pernah mensyaratkan database.
 * 4. Suite yang butuh database gagal cepat dengan petunjuk jelas jika TEST_DATABASE_URL kosong.
 */

// Simpan DATABASE_URL asli sebelum dihapus dari runtime worker
const originalDatabaseUrl = process.env.DATABASE_URL;
const originalDirectUrl = process.env.DIRECT_URL;

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();

if (testDatabaseUrl) {
  // Validasi URL tes terhadap guard
  assertSafeTestDatabaseUrl(testDatabaseUrl, {
    ...process.env,
    DATABASE_URL: originalDatabaseUrl,
    DIRECT_URL: originalDirectUrl,
  });

  // Pasang ke runtime process.env SEBELUM Prisma client atau modul lain membaca DATABASE_URL
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.DIRECT_URL = testDatabaseUrl;
} else {
  // TEST_DATABASE_URL kosong: amankan runtime dengan mematikan DATABASE_URL asli
  delete process.env.DATABASE_URL;
  delete process.env.DIRECT_URL;

  // Cek apakah file tes saat ini adalah tes murni atau tes yang membutuhkan database
  const currentTestPath = (expect.getState()?.testPath || "").replace(/\\/g, "/");

  const isPureTest =
    (currentTestPath.includes("/tests/habits/") ||
      currentTestPath.includes("/tests/support/")) &&
    !currentTestPath.includes("schema.constraints.test.ts") &&
    !currentTestPath.includes(".db.test.ts") &&
    !currentTestPath.includes(".integration.test.ts");

  if (!isPureTest && currentTestPath) {
    throw new Error(
      `\n================================================================================\n` +
        `[DB GUARD] TEST_DATABASE_URL TIDAK DIKONFIGURASI!\n` +
        `--------------------------------------------------------------------------------\n` +
        `Suite pengujian "${currentTestPath}" memerlukan database pengujian lokal.\n` +
        `Sistem menolak keras mengeksekusi tes terhadap database remote/aplikasi (.env)!\n\n` +
        `Langkah untuk menjalankan tes database secara aman:\n` +
        `1. Sediakan PostgreSQL lokal (mis. Docker atau instance lokal):\n` +
        `   Port bebas, pastikan nama database mengandung "test" (mis. mylife_test).\n` +
        `2. Set TEST_DATABASE_URL di environment Anda:\n` +
        `   TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5433/mylife_test"\n` +
        `3. Jalankan persiapan skema:\n` +
        `   npm run db:test:prepare\n` +
        `4. Jalankan kembali tes.\n` +
        `================================================================================\n`,
    );
  }
}
