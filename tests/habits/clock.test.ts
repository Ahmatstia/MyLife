import { describe, expect, it } from "vitest";
import { FakeClock, SystemClock } from "@/lib/habits/clock";

describe("Clock", () => {
  it("SystemClock mengembalikan waktu nyata", () => {
    const before = Date.now();
    const now = new SystemClock().now().getTime();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });

  it("FakeClock tetap diam sampai diubah", () => {
    const clock = new FakeClock("2026-10-10T00:00:00Z");
    expect(clock.now().toISOString()).toBe("2026-10-10T00:00:00.000Z");
    expect(clock.now().toISOString()).toBe("2026-10-10T00:00:00.000Z");
  });

  it("FakeClock.advance dan set", () => {
    const clock = new FakeClock(new Date("2026-10-10T00:00:00Z"));
    clock.advance(3600_000);
    expect(clock.now().toISOString()).toBe("2026-10-10T01:00:00.000Z");
    clock.set(Date.parse("2026-11-01T00:00:00Z"));
    expect(clock.now().toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });

  it("FakeClock.now mengembalikan salinan (tidak bisa dimutasi dari luar)", () => {
    const clock = new FakeClock("2026-10-10T00:00:00Z");
    clock.now().setUTCFullYear(2000);
    expect(clock.now().toISOString()).toBe("2026-10-10T00:00:00.000Z");
  });

  it("FakeClock menolak waktu tidak valid", () => {
    expect(() => new FakeClock("bukan-tanggal")).toThrow();
  });
});
