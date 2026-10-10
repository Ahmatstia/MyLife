/**
 * Guard database pengujian: fungsi murni untuk memvalidasi bahwa TEST_DATABASE_URL
 * benar-benar aman, menunjuk ke host lokal/pengujian, dan tidak menyentuh database remote/produksi.
 */

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Menghapus/menyamarkan password dalam connection string agar aman dicetak dalam error message/log.
 */
export function sanitizeDatabaseUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== "string") return "(empty)";
  try {
    const parsed = new URL(rawUrl);
    if (parsed.password) {
      parsed.password = "***";
    }
    return parsed.toString();
  } catch {
    // Fallback regex jika URL tidak valid secara sintaks URL standar
    return rawUrl.replace(/(\/\/[^:/@]+):([^@]+)@/, "$1:***@");
  }
}

/**
 * Memvalidasi apakah connection string aman untuk dipakai sebagai database pengujian.
 * Melempar Error dengan pesan yang jelas dan tersanitasi jika tidak memenuhi syarat.
 *
 * Syarat:
 * 1. URL tidak boleh kosong.
 * 2. Protokol harus postgres: atau postgresql:.
 * 3. Host DILARANG mengandung "supabase" dalam kondisi apa pun.
 * 4. Host WAJIB localhost/127.0.0.1/::1, atau terdaftar di env.TEST_DB_ALLOWED_HOSTS.
 * 5. Nama database WAJIB mengandung kata "test" (case-insensitive).
 * 6. URL DILARANG sama dengan DATABASE_URL atau DIRECT_URL di env.
 * 7. Pesan error TIDAK PERNAH mencetak password asli.
 */
export function assertSafeTestDatabaseUrl(
  url?: string | null,
  env: Record<string, string | undefined> = process.env,
): void {
  if (!url || typeof url !== "string" || url.trim() === "") {
    throw new Error(
      "[DB GUARD] TEST_DATABASE_URL wajib diisi untuk suite pengujian yang membutuhkan database. " +
        "Contoh: postgresql://postgres:postgres@localhost:5433/mylife_test",
    );
  }

  const trimmedUrl = url.trim();
  const safeUrl = sanitizeDatabaseUrl(trimmedUrl);

  let parsed: URL;
  try {
    parsed = new URL(trimmedUrl);
  } catch {
    throw new Error(`[DB GUARD] Format TEST_DATABASE_URL tidak valid: ${safeUrl}`);
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== "postgres:" && protocol !== "postgresql:") {
    throw new Error(
      `[DB GUARD] Protokol database harus postgres: atau postgresql:, diterima "${parsed.protocol}" pada: ${safeUrl}`,
    );
  }

  const hostname = parsed.hostname.toLowerCase();

  // 1. Larangan mutlak untuk instance Supabase
  if (hostname.includes("supabase")) {
    throw new Error(
      `[DB GUARD] DITOLAK: Host "${parsed.hostname}" mengandung "supabase". Database Supabase remote DILARANG KERAS dipakai untuk tes! URL: ${safeUrl}`,
    );
  }

  // 2. Host harus localhost / 127.0.0.1 / ::1 atau terdaftar di TEST_DB_ALLOWED_HOSTS
  const allowedHosts = new Set(LOCAL_HOSTS);
  if (env.TEST_DB_ALLOWED_HOSTS) {
    for (const h of env.TEST_DB_ALLOWED_HOSTS.split(",")) {
      const clean = h.trim().toLowerCase();
      if (clean) allowedHosts.add(clean);
    }
  }

  if (!allowedHosts.has(hostname)) {
    throw new Error(
      `[DB GUARD] Host "${parsed.hostname}" tidak diizinkan untuk pengujian. Host harus localhost, 127.0.0.1, ::1, atau terdaftar di TEST_DB_ALLOWED_HOSTS. URL: ${safeUrl}`,
    );
  }

  // 3. Nama database WAJIB mengandung kata "test" (case-insensitive)
  const rawDbName = parsed.pathname.replace(/^\//, "").split("?")[0].trim();
  if (!rawDbName || !rawDbName.toLowerCase().includes("test")) {
    throw new Error(
      `[DB GUARD] Nama database "${rawDbName || "(kosong)"}" WAJIB mengandung kata "test" (case-insensitive). Target URL: ${safeUrl}`,
    );
  }

  // 4. URL DILARANG sama dengan DATABASE_URL atau DIRECT_URL
  const compareWithEnv = (envVarName: string, envVal?: string | null) => {
    if (!envVal || typeof envVal !== "string") return;
    try {
      const parsedEnv = new URL(envVal.trim());
      // Bandingkan hostname, port, dan pathname
      if (
        parsedEnv.hostname.toLowerCase() === hostname &&
        parsedEnv.port === parsed.port &&
        parsedEnv.pathname.toLowerCase() === parsed.pathname.toLowerCase()
      ) {
        throw new Error(
          `[DB GUARD] DITOLAK: TEST_DATABASE_URL mengarah ke database yang sama dengan ${envVarName} (${safeUrl}). Tes dilarang menyentuh database aplikasi!`,
        );
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("[DB GUARD]")) throw e;
      // Jika envVal bukan valid URL, bandingkan string langsung
      if (envVal.trim() === trimmedUrl) {
        throw new Error(
          `[DB GUARD] DITOLAK: TEST_DATABASE_URL identik dengan ${envVarName}. Tes dilarang menyentuh database aplikasi!`,
        );
      }
    }
  };

  compareWithEnv("DATABASE_URL", env.DATABASE_URL);
  compareWithEnv("DIRECT_URL", env.DIRECT_URL);
}
