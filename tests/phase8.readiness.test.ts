import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET as healthCheck } from "@/app/api/health/route";
import { sanitize } from "@/lib/logger";
import { getUserAccountStats } from "@/services/user.service";
import nextConfig from "../next.config";
import fs from "node:fs";
import path from "node:path";

describe("Phase 8: Stabilization, Performance, UX Polish & Production Readiness", { timeout: 90000 }, () => {
  const userA = "phase8_user_a";

  beforeAll(async () => {
    // Cleanup test user
    await prisma.user.deleteMany({
      where: { id: userA },
    });

    // Create user
    await prisma.user.create({
      data: {
        id: userA,
        email: "phase8_a@mylife.test",
        name: "User A Phase 8",
        passwordHash: "secure_phase8_hash",
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { id: userA },
    });
  });

  describe("1. Health Check Endpoint (/api/health)", () => {
    it("should return HTTP 200 with ok status and connected database", async () => {
      const response = await healthCheck();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe("ok");
      expect(data.database).toBe("connected");
      expect(typeof data.timestamp).toBe("string");
      expect(typeof data.uptime).toBe("number");
      expect(data.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe("2. Production Security Headers", () => {
    it("should define strict security headers in next.config.ts", async () => {
      expect(nextConfig.headers).toBeDefined();
      if (nextConfig.headers) {
        const headerRules = await nextConfig.headers();
        expect(Array.isArray(headerRules)).toBe(true);
        expect(headerRules.length).toBeGreaterThan(0);

        const wildcardRule = headerRules.find((rule) => rule.source === "/:path*");
        expect(wildcardRule).toBeDefined();

        const headers = wildcardRule!.headers;
        const headerMap = new Map(headers.map((h) => [h.key, h.value]));

        expect(headerMap.get("X-Content-Type-Options")).toBe("nosniff");
        expect(headerMap.get("X-Frame-Options")).toBe("SAMEORIGIN");
        expect(headerMap.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
        expect(headerMap.get("Strict-Transport-Security")).toContain("max-age=");
        expect(headerMap.get("Permissions-Policy")).toContain("camera=()");
      }
    });
  });

  describe("3. Structured Observability & Sensitive Data Sanitization", () => {
    it("should redact sensitive fields while preserving standard metadata", () => {
      const rawPayload = {
        userId: "usr_123",
        email: "user@example.com",
        password: "super_secret_password",
        token: "jwt.token.secret",
        cookie: "session=xyz",
        accessCode: "ACC-1234",
        nested: {
          apiKey: "sk-12345678",
          action: "login",
        },
      };

      const sanitized = sanitize(rawPayload) as typeof rawPayload;

      expect(sanitized.userId).toBe("usr_123");
      expect(sanitized.email).toBe("user@example.com");
      expect(sanitized.password).toBe("[REDACTED]");
      expect(sanitized.token).toBe("[REDACTED]");
      expect(sanitized.cookie).toBe("[REDACTED]");
      expect(sanitized.accessCode).toBe("[REDACTED]");
      expect(sanitized.nested.apiKey).toBe("[REDACTED]");
      expect(sanitized.nested.action).toBe("login");
    });
  });

  describe("4. Architectural Purity (Zero Direct Prisma In UI & Routes)", () => {
    function scanDir(dir: string): string[] {
      const files: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...scanDir(fullPath));
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
      return files;
    }

    it("should have zero direct prisma imports in src/app/(app) and src/app/api", () => {
      const appDir = path.resolve(__dirname, "../src/app");
      const files = scanDir(appDir);

      const violations: string[] = [];
      const prismaImportRegex = /from\s+["']@\/lib\/prisma["']/;

      for (const file of files) {
        const content = fs.readFileSync(file, "utf8");
        if (prismaImportRegex.test(content)) {
          violations.push(path.relative(appDir, file));
        }
      }

      expect(violations).toEqual([]);
    });
  });

  describe("5. User Account Statistics Service", () => {
    it("should accurately compute goals, tasks, and sessions counts via service layer", async () => {
      const initialStats = await getUserAccountStats(userA);
      expect(initialStats.goalCount).toBe(0);
      expect(initialStats.taskCount).toBe(0);
      expect(initialStats.sessionCount).toBe(0);

      // Create a Goal
      const goal = await prisma.goal.create({
        data: {
          userId: userA,
          title: "Phase 8 Verification Goal",
          type: "LEARNING",
        },
      });

      // Create a Stage
      const stage = await prisma.stage.create({
        data: {
          goalId: goal.id,
          userId: userA,
          name: "Stage 1",
          order: 0,
        },
      });

      // Create a Task
      const task = await prisma.task.create({
        data: {
          stageId: stage.id,
          userId: userA,
          title: "Task 1",
        },
      });

      // Create a Session
      await prisma.session.create({
        data: {
          taskId: task.id,
          userId: userA,
          startedAt: new Date(),
        },
      });

      const updatedStats = await getUserAccountStats(userA);
      expect(updatedStats.goalCount).toBe(1);
      expect(updatedStats.taskCount).toBe(1);
      expect(updatedStats.sessionCount).toBe(1);
    });
  });

  describe("6. Database Integrity Constraints", () => {
    it("should satisfy chk_task_parent with zero orphan tasks", async () => {
      const orphanTasks = await prisma.task.count({
        where: {
          stageId: null,
          projectId: null,
          areaId: null,
          milestoneId: null,
        },
      });
      expect(orphanTasks).toBe(0);
    });

    it("should satisfy chk_task_parent with zero dual-parent tasks", async () => {
      const dualParentTasks = await prisma.task.count({
        where: {
          stageId: { not: null },
          projectId: { not: null },
        },
      });
      expect(dualParentTasks).toBe(0);
    });

    it("should satisfy idx_unique_active_session_per_user with zero duplicates", async () => {
      const activeSessions = await prisma.session.findMany({
        where: { endedAt: null },
        select: { userId: true },
      });

      const userCounts = new Map<string, number>();
      for (const s of activeSessions) {
        userCounts.set(s.userId, (userCounts.get(s.userId) ?? 0) + 1);
      }

      const duplicateUsers = Array.from(userCounts.entries()).filter(([, count]) => count > 1);
      expect(duplicateUsers).toEqual([]);
    });
  });
});
