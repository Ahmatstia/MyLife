import { describe, expect, it } from "vitest";
import { assertSafeTestDatabaseUrl, sanitizeDatabaseUrl } from "./db-guard";

describe("sanitizeDatabaseUrl", () => {
  it("menyamarkan password dengan ***", () => {
    const raw = "postgresql://myuser:super_secret_password_123@localhost:5433/mylife_test";
    const sanitized = sanitizeDatabaseUrl(raw);
    expect(sanitized).not.toContain("super_secret_password_123");
    expect(sanitized).toContain("myuser:***@localhost:5433/mylife_test");
  });

  it("menangani URL tanpa password atau input kosong", () => {
    expect(sanitizeDatabaseUrl("postgresql://localhost:5432/test")).toBe("postgresql://localhost:5432/test");
    expect(sanitizeDatabaseUrl("")).toBe("(empty)");
    expect(sanitizeDatabaseUrl(null)).toBe("(empty)");
  });
});

describe("assertSafeTestDatabaseUrl", () => {
  const SECRET_PASS = "super_secret_password_xyz987";
  const dummyEnv = {
    DATABASE_URL: "postgresql://postgres:prodpass@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres",
    DIRECT_URL: "postgresql://postgres:prodpass@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres",
  };

  describe("Kasus lolos (valid test database)", () => {
    it("menerima localhost dengan nama db mengandung 'test'", () => {
      expect(() =>
        assertSafeTestDatabaseUrl(`postgresql://postgres:${SECRET_PASS}@localhost:5433/mylife_test`, dummyEnv),
      ).not.toThrow();
    });

    it("menerima 127.0.0.1", () => {
      expect(() =>
        assertSafeTestDatabaseUrl(`postgresql://user:${SECRET_PASS}@127.0.0.1:5432/test_db?schema=public`, dummyEnv),
      ).not.toThrow();
    });

    it("menerima IPv6 [::1]", () => {
      expect(() =>
        assertSafeTestDatabaseUrl(`postgresql://user:${SECRET_PASS}@[::1]:5432/TEST_DATABASE`, dummyEnv),
      ).not.toThrow();
    });

    it("menerima host yang terdaftar di TEST_DB_ALLOWED_HOSTS (mis. container CI)", () => {
      const ciEnv = {
        ...dummyEnv,
        TEST_DB_ALLOWED_HOSTS: "postgres,ci-runner-db",
      };
      expect(() =>
        assertSafeTestDatabaseUrl(`postgresql://postgres:${SECRET_PASS}@postgres:5432/test`, ciEnv),
      ).not.toThrow();
    });
  });

  describe("Kasus ditolak & sanitasi password", () => {
    it("menolak URL kosong atau undefined", () => {
      expect(() => assertSafeTestDatabaseUrl("", dummyEnv)).toThrow(/wajib diisi/i);
      expect(() => assertSafeTestDatabaseUrl(undefined, dummyEnv)).toThrow(/wajib diisi/i);
      expect(() => assertSafeTestDatabaseUrl("   ", dummyEnv)).toThrow(/wajib diisi/i);
    });

    it("menolak host Supabase apa pun kondisinya (pooler remote)", () => {
      const url = `postgresql://postgres.project:${SECRET_PASS}@aws-0-ap-southeast-2.pooler.supabase.com:6543/test_db`;
      let errorMsg = "";
      try {
        assertSafeTestDatabaseUrl(url, dummyEnv);
      } catch (err: unknown) {
        if (err instanceof Error) errorMsg = err.message;
      }
      expect(errorMsg).toMatch(/supabase/i);
      expect(errorMsg).not.toContain(SECRET_PASS);
      expect(errorMsg).toContain("***");
    });

    it("menolak host Supabase direct domain meskipun nama db 'test'", () => {
      const url = `postgresql://postgres:${SECRET_PASS}@db.abcdefgh.supabase.co:5432/mylife_test`;
      expect(() => assertSafeTestDatabaseUrl(url, dummyEnv)).toThrow(/supabase/i);
    });

    it("menolak nama database yang tidak mengandung 'test' (misal 'postgres')", () => {
      const url = `postgresql://postgres:${SECRET_PASS}@localhost:5432/postgres`;
      let errorMsg = "";
      try {
        assertSafeTestDatabaseUrl(url, dummyEnv);
      } catch (err: unknown) {
        if (err instanceof Error) errorMsg = err.message;
      }
      expect(errorMsg).toMatch(/WAJIB mengandung kata "test"/i);
      expect(errorMsg).not.toContain(SECRET_PASS);
      expect(errorMsg).toContain("postgres");
    });

    it("menolak nama database kosong", () => {
      const url = `postgresql://postgres:${SECRET_PASS}@localhost:5432/`;
      expect(() => assertSafeTestDatabaseUrl(url, dummyEnv)).toThrow(/WAJIB mengandung kata "test"/i);
    });

    it("menolak host remote sembarang yang bukan localhost / allowed host", () => {
      const url = `postgresql://postgres:${SECRET_PASS}@192.168.1.100:5432/my_test`;
      expect(() => assertSafeTestDatabaseUrl(url, dummyEnv)).toThrow(/tidak diizinkan/i);
    });

    it("menolak jika TEST_DATABASE_URL sama dengan DATABASE_URL", () => {
      const localEnv = {
        DATABASE_URL: `postgresql://postgres:${SECRET_PASS}@localhost:5432/test_shared`,
      };
      expect(() =>
        assertSafeTestDatabaseUrl(`postgresql://postgres:${SECRET_PASS}@localhost:5432/test_shared`, localEnv),
      ).toThrow(/identik|database yang sama dengan DATABASE_URL/i);
    });

    it("menolak jika TEST_DATABASE_URL sama dengan DIRECT_URL", () => {
      const localEnv = {
        DATABASE_URL: `postgresql://postgres:${SECRET_PASS}@localhost:5432/other_test`,
        DIRECT_URL: `postgresql://postgres:${SECRET_PASS}@localhost:5432/test_shared`,
      };
      expect(() =>
        assertSafeTestDatabaseUrl(`postgresql://postgres:${SECRET_PASS}@localhost:5432/test_shared`, localEnv),
      ).toThrow(/identik|database yang sama dengan DIRECT_URL/i);
    });

    it("menolak protokol selain postgres / postgresql", () => {
      const url = `mysql://root:${SECRET_PASS}@localhost:3306/test_db`;
      expect(() => assertSafeTestDatabaseUrl(url, dummyEnv)).toThrow(/Protokol database harus/i);
    });

    it("memastikan password rahasia tidak pernah bocor dalam pesan error apa pun", () => {
      const urlsToFail = [
        `postgresql://user:${SECRET_PASS}@unknown-host:5432/test_db`,
        `postgresql://user:${SECRET_PASS}@localhost:5432/production_db`,
        `postgresql://user:${SECRET_PASS}@db.supabase.com:5432/test_db`,
      ];

      for (const u of urlsToFail) {
        try {
          assertSafeTestDatabaseUrl(u, dummyEnv);
          expect.fail("Harusnya melempar error");
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          expect(msg).not.toContain(SECRET_PASS);
          expect(msg).toContain("***");
        }
      }
    });
  });
});
