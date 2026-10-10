import { describe, it, expect } from "vitest";
import {
  computeHabitInsights,
  computeRiskWindows,
  computeRiskDays,
  computeTopTriggers,
  computeHaltShare,
  computeMoodCorrelation,
  computeUrgeDuration,
  computePlanEffectiveness,
  computeEarlyBurstEducation,
  buildHeatmap,
  HabitEventInsightInput,
} from "@/lib/habits/insights";

describe("Habits V2 - Langkah 4.1: Insight Engine Pure Logic", () => {
  const baseNow = new Date("2026-10-15T12:00:00.000Z"); // Kamis
  const startedAtOld = new Date("2026-09-01T00:00:00.000Z"); // 44 hari lalu

  it("Ambang batas minimum: tidak menampilkan insight jika data < 14 hari atau < 10 event", () => {
    // Kasus 1: < 14 hari
    const newStartedAt = new Date("2026-10-10T00:00:00.000Z"); // 5 hari lalu
    const fewEvents: HabitEventInsightInput[] = Array.from({ length: 12 }, (_, i) => ({
      id: `ev-${i}`,
      kind: "URGE",
      occurredAt: new Date("2026-10-12T10:00:00.000Z"),
    }));

    const resultShortTime = computeHabitInsights({
      startedAt: newStartedAt,
      now: baseNow,
      events: fewEvents,
    });

    expect(resultShortTime.hasSufficientData).toBe(false);
    expect(resultShortTime.insights).toHaveLength(0);
    expect(resultShortTime.threshold.actualDays).toBeLessThan(14);

    // Kasus 2: >= 14 hari tapi event < 10
    const resultFewEvents = computeHabitInsights({
      startedAt: startedAtOld,
      now: baseNow,
      events: fewEvents.slice(0, 5),
    });

    expect(resultFewEvents.hasSufficientData).toBe(false);
    expect(resultFewEvents.insights).toHaveLength(0);
    expect(resultFewEvents.threshold.actualEvents).toBe(5);
  });

  it("Jendela rawan (Risk Windows): mengenali bin (hari, jam) dengan pembobotan eksponensial", () => {
    // Buat kluster: Jumat pukul 21:00 (Asia/Jakarta)
    // 2026-10-09 adalah Jumat. Jam 21:00 WIB = 14:00 UTC
    const clusterDate1 = new Date("2026-10-09T14:15:00.000Z"); // 6 hari lalu
    const clusterDate2 = new Date("2026-10-02T14:20:00.000Z"); // 13 hari lalu
    const clusterDate3 = new Date("2026-09-25T14:10:00.000Z"); // 20 hari lalu
    const clusterDate4 = new Date("2026-09-18T14:45:00.000Z"); // 27 hari lalu

    const events: HabitEventInsightInput[] = [
      { id: "c1", kind: "URGE", occurredAt: clusterDate1 },
      { id: "c2", kind: "URGE", occurredAt: clusterDate2 },
      { id: "c3", kind: "URGE", occurredAt: clusterDate3 },
      { id: "c4", kind: "LAPSE", occurredAt: clusterDate4 },
    ];

    const riskInsight = computeRiskWindows(events, baseNow, "Asia/Jakarta", 30);
    expect(riskInsight).not.toBeNull();
    expect(riskInsight?.kind).toBe("RISK_WINDOWS");
    expect(riskInsight?.text).toContain("Jumat");
    expect(riskInsight?.text).toContain("21:00");
    expect(riskInsight?.evidence.sampleSize).toBe(4);
  });

  it("Hari paling rawan (Risk Days): mendeteksi hari dengan konsentrasi dorongan tertinggi", () => {
    // 6 kejadian di hari Minggu (2026-10-11 adalah Minggu)
    const sunday = new Date("2026-10-11T05:00:00.000Z");
    const monday = new Date("2026-10-12T05:00:00.000Z");

    const events: HabitEventInsightInput[] = [
      ...Array.from({ length: 6 }, (_, i) => ({
        id: `sun-${i}`,
        kind: "URGE" as const,
        occurredAt: sunday,
      })),
      { id: "mon-1", kind: "URGE", occurredAt: monday },
    ];

    const dayInsight = computeRiskDays(events, "Asia/Jakarta", 30);
    expect(dayInsight).not.toBeNull();
    expect(dayInsight?.kind).toBe("RISK_DAYS");
    expect(dayInsight?.text).toContain("Minggu");
    expect(dayInsight?.text).toContain("6 dari 7 kejadian");
  });

  it("Pemicu dominan (Top Triggers): mengelompokkan dan merangking pemicu dengan benar", () => {
    const events: HabitEventInsightInput[] = [
      {
        id: "e1",
        kind: "URGE",
        occurredAt: baseNow,
        triggers: [{ id: "t-stress", name: "Beban Kerja Menumpuk" }],
      },
      {
        id: "e2",
        kind: "URGE",
        occurredAt: baseNow,
        triggers: [
          { id: "t-stress", name: "Beban Kerja Menumpuk" },
          { id: "t-night", name: "Sendirian Larut Malam" },
        ],
      },
      {
        id: "e3",
        kind: "URGE",
        occurredAt: baseNow,
        triggers: [{ id: "t-stress", name: "Beban Kerja Menumpuk" }],
      },
    ];

    const triggerInsight = computeTopTriggers(events, 30);
    expect(triggerInsight).not.toBeNull();
    expect(triggerInsight?.kind).toBe("TOP_TRIGGERS");
    expect(triggerInsight?.text).toContain("Beban Kerja Menumpuk");
    expect(triggerInsight?.text).toContain("(3x)");
  });

  it("Porsi HALT+B: menghitung persentase faktor fisik/emosional dan mengenali yang dominan", () => {
    const events: HabitEventInsightInput[] = [
      { id: "h1", kind: "URGE", occurredAt: baseNow, haltState: ["TIRED", "BORED"] },
      { id: "h2", kind: "URGE", occurredAt: baseNow, haltState: ["TIRED"] },
      { id: "h3", kind: "URGE", occurredAt: baseNow, haltState: ["TIRED", "ANGRY"] },
    ];

    const haltInsight = computeHaltShare(events, 30);
    expect(haltInsight).not.toBeNull();
    expect(haltInsight?.kind).toBe("HALT_SHARE");
    expect(haltInsight?.text).toContain("Lelah (Tired)");
    expect(haltInsight?.text).toContain("60%"); // 3 dari 5 total tags
  });

  it("Korelasi Suasana Hati: WAJIB menyertakan label disclaimer bahwa ini korelasi bukan sebab-akibat", () => {
    const events: HabitEventInsightInput[] = Array.from({ length: 6 }, (_, i) => ({
      id: `m-${i}`,
      kind: "URGE" as const,
      occurredAt: baseNow,
      mood: 2,
    }));

    const checkins = Array.from({ length: 6 }, (_, i) => ({
      id: `c-${i}`,
      periodDate: `2026-10-0${i + 1}`,
      mood: 4,
      status: "CONFIRMED_CLEAN" as const,
    }));

    const moodInsight = computeMoodCorrelation(events, checkins, 30);
    expect(moodInsight).not.toBeNull();
    expect(moodInsight?.kind).toBe("MOOD_CORRELATION");
    // Verifikasi aturan K-1 / Gerbang QA Fase 4: disclaimer non-kausalitas
    expect(moodInsight?.text).toContain("korelasi statistik, bukan bukti sebab-akibat langsung");
  });

  it("Durasi dorongan: merata-ratakan durasi dan mengaitkannya dengan edukasi Urge Surfing", () => {
    const events: HabitEventInsightInput[] = [
      { id: "d1", kind: "URGE", occurredAt: baseNow, durationMinutes: 10 },
      { id: "d2", kind: "URGE", occurredAt: baseNow, durationMinutes: 15 },
      { id: "d3", kind: "URGE", occurredAt: baseNow, durationMinutes: 20 },
    ];

    const durationInsight = computeUrgeDuration(events, 30);
    expect(durationInsight).not.toBeNull();
    expect(durationInsight?.kind).toBe("URGE_DURATION");
    expect(durationInsight?.text).toContain("15 menit");
    expect(durationInsight?.text).toContain("Urge Surfing");
  });

  it("Efektivitas rencana penanganan: menghitung persentase keberhasilan rencana coping", () => {
    const events: HabitEventInsightInput[] = [
      {
        id: "p1",
        kind: "URGE",
        occurredAt: baseNow,
        copingPlanId: "cp-1",
        copingPlanTitle: "Minum Air Dingin & Jalan Kaki",
        copingPlanSuccess: true,
      },
      {
        id: "p2",
        kind: "URGE",
        occurredAt: baseNow,
        copingPlanId: "cp-1",
        copingPlanTitle: "Minum Air Dingin & Jalan Kaki",
        copingPlanSuccess: true,
      },
      {
        id: "p3",
        kind: "URGE",
        occurredAt: baseNow,
        copingPlanId: "cp-1",
        copingPlanTitle: "Minum Air Dingin & Jalan Kaki",
        copingPlanSuccess: false,
      },
    ];

    const planInsight = computePlanEffectiveness(events, 30);
    expect(planInsight).not.toBeNull();
    expect(planInsight?.kind).toBe("PLAN_EFFECTIVENESS");
    expect(planInsight?.text).toContain("Minum Air Dingin & Jalan Kaki");
    expect(planInsight?.text).toContain("67%"); // 2 dari 3
  });

  it("Edukasi Extinction Burst: muncul pada hari 7..35 dengan pesan non-judgmental", () => {
    const events: HabitEventInsightInput[] = Array.from({ length: 6 }, (_, i) => ({
      id: `eb-${i}`,
      kind: "URGE" as const,
      occurredAt: baseNow,
    }));

    const burstInsight = computeEarlyBurstEducation(events, 14); // 14 hari
    expect(burstInsight).not.toBeNull();
    expect(burstInsight?.kind).toBe("EARLY_BURST_EDUCATION");
    expect(burstInsight?.text).toContain("Extinction Burst");
    // Tidak boleh mengandung kata-kata menyalahkan
    expect(burstInsight?.text).not.toContain("gagal");
    expect(burstInsight?.text).not.toContain("kalah");
  });

  it("Heatmap 7x24: menghitung grid distribusi waktu dengan benar", () => {
    // 2026-10-12 adalah Senin. Pukul 08:00 WIB = 01:00 UTC
    const monday8am = new Date("2026-10-12T01:00:00.000Z");
    const events: HabitEventInsightInput[] = [
      { id: "hm1", kind: "URGE", occurredAt: monday8am },
      { id: "hm2", kind: "URGE", occurredAt: monday8am },
    ];

    const { grid, maxCount } = buildHeatmap(events, "Asia/Jakarta");
    expect(grid[0][8]).toBe(2); // Senin (index 0), jam 8
    expect(maxCount).toBe(2);
  });
});
