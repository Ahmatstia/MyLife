import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Habits V2 - Langkah 5.4: Penguncian dari AI (K-8) & Isolasi Momentum", () => {
  it("Memastikan seluruh modul AI tidak meng-import service atau repository habit v2", () => {
    const servicesDir = path.resolve(process.cwd(), "src/services");
    const aiFiles = fs
      .readdirSync(servicesDir)
      .filter((f) => f.startsWith("ai") && (f.endsWith(".ts") || f.endsWith(".tsx")));

    expect(aiFiles.length).toBeGreaterThan(0);

    const forbiddenImports = [
      "@/repositories/habits",
      "@/services/habits",
      "@/lib/habits",
      "trackedHabit",
      "habitEvent",
      "habitBreakProfile",
      "habitBuildProfile",
    ];

    for (const file of aiFiles) {
      const filePath = path.join(servicesDir, file);
      const content = fs.readFileSync(filePath, "utf-8");

      for (const forbidden of forbiddenImports) {
        expect(
          content.includes(forbidden),
          `Modul AI (${file}) terdeteksi mengakses atau meng-import domain habit v2: "${forbidden}" (Melanggar K-8)`
        ).toBe(false);
      }
    }
  });

  it("Memastikan Momentum & Insights lama tidak membaca HabitEvent (Langkah 5.3)", () => {
    const servicesDir = path.resolve(process.cwd(), "src/services");
    const momentumFile = path.join(servicesDir, "momentum.service.ts");

    if (fs.existsSync(momentumFile)) {
      const content = fs.readFileSync(momentumFile, "utf-8");
      expect(content.includes("habitEvent")).toBe(false);
      expect(content.includes("HabitEvent")).toBe(false);
    }
  });
});
