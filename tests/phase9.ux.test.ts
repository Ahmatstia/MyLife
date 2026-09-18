import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { getTaskDetail } from "@/services/task.service";
import { findProject } from "@/repositories/project.repository";
import fs from "node:fs";
import path from "node:path";

describe("Phase 9: Real User Experience & Product Validation", { timeout: 90000 }, () => {
  const userA = "phase9_ux_user_a";

  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: { id: userA },
    });

    await prisma.user.create({
      data: {
        id: userA,
        email: "phase9_ux@mylife.test",
        name: "User Phase 9 UX",
        passwordHash: "secure_p9_hash",
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { id: userA },
    });
  });

  describe("1. Dual-Parent Task Detail Safety (ISSUE-01)", () => {
    it("should safely resolve task detail for a Project-parented task without crashing", async () => {
      // Create Project
      const project = await prisma.project.create({
        data: {
          userId: userA,
          title: "UX Project Alpha",
          status: "ACTIVE",
          priority: "HIGH",
        },
      });

      // Create Milestone
      const milestone = await prisma.milestone.create({
        data: {
          userId: userA,
          projectId: project.id,
          title: "Milestone 1",
          order: 0,
        },
      });

      // Create Task parented to Project & Milestone (no Stage)
      const task = await prisma.task.create({
        data: {
          userId: userA,
          projectId: project.id,
          milestoneId: milestone.id,
          stageId: null,
          title: "Setup ergonomic desk",
          priority: "HIGH",
        },
      });

      // Retrieve detail via service
      const detail = await getTaskDetail(task.id, userA);
      expect(detail).toBeDefined();
      expect(detail!.task.id).toBe(task.id);
      expect(detail!.task.stage).toBeNull();
      expect(detail!.task.project).toBeDefined();
      expect(detail!.task.project!.title).toBe("UX Project Alpha");
      expect(detail!.task.milestone).toBeDefined();
      expect(detail!.task.milestone!.title).toBe("Milestone 1");

      // Test breadcrumb logic does not throw
      const hasStage = !!detail!.task.stage;
      const hasProject = !!detail!.task.project;
      expect(hasStage).toBe(false);
      expect(hasProject).toBe(true);

      const parentTitle = detail!.task.stage?.goal?.title ?? detail!.task.project?.title;
      expect(parentTitle).toBe("UX Project Alpha");
    });
  });

  describe("2. Project Detail Tasks Integration (ISSUE-02)", () => {
    it("should include project tasks in findProject repository response", async () => {
      const project = await prisma.project.findFirst({
        where: { userId: userA },
      });
      expect(project).toBeDefined();

      const fullProject = await findProject(userA, project!.id);
      expect(fullProject).toBeDefined();
      expect(Array.isArray(fullProject!.tasks)).toBe(true);
      expect(fullProject!.tasks.length).toBeGreaterThan(0);
      expect(fullProject!.tasks[0].title).toBe("Setup ergonomic desk");
    });
  });

  describe("3. Product Branding Consistency (ISSUE-03)", () => {
    it("should display MyLife brand across Sidebar, AppShell, and Home login screen", () => {
      const sidebarPath = path.resolve(__dirname, "../src/app/components/shell/Sidebar.tsx");
      const appShellPath = path.resolve(__dirname, "../src/app/components/shell/AppShell.tsx");
      const homePath = path.resolve(__dirname, "../src/app/(app)/page.tsx");

      const sidebarContent = fs.readFileSync(sidebarPath, "utf8");
      const appShellContent = fs.readFileSync(appShellPath, "utf8");
      const homeContent = fs.readFileSync(homePath, "utf8");

      expect(sidebarContent).toContain("My<span className=\"gradient-text\">Life</span>");
      expect(appShellContent).toContain("My<span className=\"gradient-text\">Life</span>");
      expect(homeContent).toContain("My<span className=\"gradient-text\">Life</span>");
    });
  });

  describe("4. Distinct Primary Navigation Icons (ISSUE-04)", () => {
    it("should use distinct icons for Progress & Refleksi and Life Copilot AI in Sidebar.tsx", () => {
      const sidebarPath = path.resolve(__dirname, "../src/app/components/shell/Sidebar.tsx");
      const sidebarContent = fs.readFileSync(sidebarPath, "utf8");

      // Verify /progress uses chart and /assistant uses sparkles
      expect(sidebarContent).toMatch(/href:\s*["']\/progress["'][^}]*icon:\s*["']chart["']/);
      expect(sidebarContent).toMatch(/href:\s*["']\/assistant["'][^}]*icon:\s*["']sparkles["']/);
    });
  });

  describe("5. First-Run Welcome Guidance on Home (ISSUE-05)", () => {
    it("should provide welcoming guidance when user has 0 goals", () => {
      const homePath = path.resolve(__dirname, "../src/app/(app)/page.tsx");
      const homeContent = fs.readFileSync(homePath, "utf8");

      expect(homeContent).toContain("Selamat Datang di MyLife");
      expect(homeContent).toContain("Buat Goal Pertama");
    });
  });
});
