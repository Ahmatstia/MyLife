import { DateTime } from "luxon";
import {
  HabitEventInsightInput,
  HabitCheckinInsightInput,
  HabitInsight,
  InsightsResult,
  RiskWindowBin,
  HaltTag,
} from "./types";

const DAY_NAMES: Record<number, string> = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  7: "Minggu",
};

const HALT_LABELS: Record<HaltTag, string> = {
  HUNGRY: "Lapar (Hungry)",
  ANGRY: "Marah/Kesal (Angry)",
  LONELY: "Kesepian (Lonely)",
  TIRED: "Lelah (Tired)",
  BORED: "Bosan (Bored)",
};

export const MIN_DAYS_THRESHOLD = 14;
export const MIN_EVENTS_THRESHOLD = 10;

export interface ComputeInsightsOptions {
  startedAt: Date;
  now?: Date;
  timezone?: string;
  events: HabitEventInsightInput[];
  checkins?: HabitCheckinInsightInput[];
}

/**
 * Menghitung selisih hari integer antara dua tanggal
 */
export function getDaysTracked(startedAt: Date, now: Date): number {
  const diffMs = now.getTime() - startedAt.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Filter event yang relevan untuk pola dorongan/kemunduran (URGE atau LAPSE)
 */
export function getRelevantEvents(events: HabitEventInsightInput[]): HabitEventInsightInput[] {
  return events.filter((e) => e.kind === "URGE" || e.kind === "LAPSE");
}

/**
 * Membangun Heatmap 7x24 dari URGE & LAPSE dalam rentang hari tertentu
 */
export function buildHeatmap(
  events: HabitEventInsightInput[],
  timezone = "Asia/Jakarta"
): { grid: number[][]; maxCount: number } {
  // 7 hari (indeks 0..6 untuk hari 1..7) x 24 jam (0..23)
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  let maxCount = 0;

  for (const event of events) {
    if (event.kind !== "URGE" && event.kind !== "LAPSE") continue;
    const dt = DateTime.fromJSDate(new Date(event.occurredAt), { zone: timezone });
    if (!dt.isValid) continue;

    const dayIndex = dt.weekday - 1; // 1=Senin -> index 0, 7=Minggu -> index 6
    const hour = dt.hour; // 0..23

    if (dayIndex >= 0 && dayIndex < 7 && hour >= 0 && hour < 24) {
      grid[dayIndex][hour]++;
      if (grid[dayIndex][hour] > maxCount) {
        maxCount = grid[dayIndex][hour];
      }
    }
  }

  return { grid, maxCount };
}

/**
 * Langkah 4.1: Menghitung jendela waktu rawan (Risk Windows)
 * Bin (hari, jam) dari URGE+LAPSE 60 hari terakhir, bobot peluruhan 0.5^(umur/30),
 * ambil 3 teratas dengan rawCount >= 3.
 */
export function computeRiskWindows(
  events: HabitEventInsightInput[],
  now: Date,
  timezone = "Asia/Jakarta",
  daysTracked = 14
): HabitInsight | null {
  const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
  const nowMs = now.getTime();

  // Bins: key = `${dayOfWeek}_${hour}`
  const binsMap = new Map<string, { dayOfWeek: number; hour: number; rawCount: number; weightedScore: number }>();

  let sampleSize = 0;

  for (const event of events) {
    if (event.kind !== "URGE" && event.kind !== "LAPSE") continue;
    const eventTime = new Date(event.occurredAt).getTime();
    const ageMs = nowMs - eventTime;
    if (ageMs < 0 || ageMs > sixtyDaysMs) continue; // di luar 60 hari terakhir

    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const weight = Math.pow(0.5, ageDays / 30); // peluruhan eksponensial t1/2 = 30 hari

    const dt = DateTime.fromJSDate(new Date(event.occurredAt), { zone: timezone });
    if (!dt.isValid) continue;

    const dayOfWeek = dt.weekday; // 1..7
    const hour = dt.hour; // 0..23
    const key = `${dayOfWeek}_${hour}`;

    sampleSize++;
    const existing = binsMap.get(key) || { dayOfWeek, hour, rawCount: 0, weightedScore: 0 };
    existing.rawCount++;
    existing.weightedScore += weight;
    binsMap.set(key, existing);
  }

  // Filter rawCount >= 3 dan urutkan berdasarkan weightedScore descending
  const candidates: RiskWindowBin[] = Array.from(binsMap.values())
    .filter((b) => b.rawCount >= 3)
    .sort((a, b) => b.weightedScore - a.weightedScore)
    .slice(0, 3)
    .map((b) => {
      const startH = b.hour.toString().padStart(2, "0");
      const endH = ((b.hour + 1) % 24).toString().padStart(2, "0");
      return {
        ...b,
        dayName: DAY_NAMES[b.dayOfWeek] || `Hari ${b.dayOfWeek}`,
        hourLabel: `${startH}:00 - ${endH}:00`,
      };
    });

  if (candidates.length === 0) return null;

  const descList = candidates.map((c) => `${c.dayName} sekitar pukul ${c.hourLabel} (${c.rawCount} kejadian)`).join(", ");
  const text = `Dorongan paling sering muncul pada rentang waktu: ${descList}. Mempersiapkan rencana atau pengingat 15-30 menit sebelum waktu ini dapat membantu Anda lebih siap.`;

  return {
    kind: "RISK_WINDOWS",
    title: "Jendela Waktu Paling Rawan",
    text,
    evidence: {
      totalEvents: events.length,
      daysTracked,
      sampleSize,
      details: { topWindows: candidates },
    },
    metadata: { topWindows: candidates },
  };
}

/**
 * Langkah 4.1: Menghitung hari paling rawan (Risk Days)
 */
export function computeRiskDays(
  events: HabitEventInsightInput[],
  timezone = "Asia/Jakarta",
  daysTracked = 14
): HabitInsight | null {
  const dayCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  let relevantCount = 0;

  for (const event of events) {
    if (event.kind !== "URGE" && event.kind !== "LAPSE") continue;
    const dt = DateTime.fromJSDate(new Date(event.occurredAt), { zone: timezone });
    if (!dt.isValid) continue;
    dayCounts[dt.weekday]++;
    relevantCount++;
  }

  if (relevantCount < 3) return null;

  let maxDay = 1;
  let maxCount = 0;
  for (let d = 1; d <= 7; d++) {
    if (dayCounts[d] > maxCount) {
      maxCount = dayCounts[d];
      maxDay = d;
    }
  }

  // Tampilkan jika hari tersebut memiliki minimal 3 kejadian dan mencakup >= 25% kejadian
  const percentage = Math.round((maxCount / relevantCount) * 100);
  if (maxCount < 3 || percentage < 25) return null;

  const dayName = DAY_NAMES[maxDay];
  return {
    kind: "RISK_DAYS",
    title: "Hari dengan Frekuensi Tertinggi",
    text: `Hari ${dayName} tercatat memiliki frekuensi dorongan tertinggi (${maxCount} dari ${relevantCount} kejadian, atau sekitar ${percentage}%).`,
    evidence: {
      totalEvents: events.length,
      daysTracked,
      sampleSize: relevantCount,
      details: { dayName, count: maxCount, percentage },
    },
  };
}

/**
 * Langkah 4.1: Pemicu dominan (Top Triggers)
 */
export function computeTopTriggers(
  events: HabitEventInsightInput[],
  daysTracked = 14
): HabitInsight | null {
  const counts = new Map<string, { id: string; name: string; count: number }>();
  let totalTriggerOccurrences = 0;

  for (const event of events) {
    if (!event.triggers || event.triggers.length === 0) continue;
    for (const t of event.triggers) {
      totalTriggerOccurrences++;
      const cur = counts.get(t.id) || { id: t.id, name: t.name, count: 0 };
      cur.count++;
      counts.set(t.id, cur);
    }
  }

  if (totalTriggerOccurrences < 3) return null;

  const topList = Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .filter((t) => t.count >= 2);

  if (topList.length === 0) return null;

  const formatted = topList.map((t) => `"${t.name}" (${t.count}x)`).join(", ");
  return {
    kind: "TOP_TRIGGERS",
    title: "Pemicu Lingkungan/Kondisi Dominan",
    text: `Pemicu yang paling sering menyertai dorongan: ${formatted}. Menyadari pemicu ini adalah langkah awal untuk memutus mata rantai otomatisnya.`,
    evidence: {
      totalEvents: events.length,
      daysTracked,
      sampleSize: totalTriggerOccurrences,
      details: { topTriggers: topList },
    },
  };
}

/**
 * Langkah 4.1: Porsi faktor HALT+B (Hungry, Angry, Lonely, Tired, Bored)
 */
export function computeHaltShare(
  events: HabitEventInsightInput[],
  daysTracked = 14
): HabitInsight | null {
  const counts: Record<HaltTag, number> = {
    HUNGRY: 0,
    ANGRY: 0,
    LONELY: 0,
    TIRED: 0,
    BORED: 0,
  };
  let totalHalt = 0;

  for (const event of events) {
    if (!event.haltState || !Array.isArray(event.haltState)) continue;
    for (const tag of event.haltState) {
      if (counts[tag] !== undefined) {
        counts[tag]++;
        totalHalt++;
      }
    }
  }

  if (totalHalt < 3) return null;

  let topTag: HaltTag = "TIRED";
  let topCount = 0;
  for (const [key, cnt] of Object.entries(counts)) {
    if (cnt > topCount) {
      topCount = cnt;
      topTag = key as HaltTag;
    }
  }

  const topPct = Math.round((topCount / totalHalt) * 100);
  const tagLabel = HALT_LABELS[topTag];

  return {
    kind: "HALT_SHARE",
    title: "Kondisi Fisik & Emosional (HALT+B)",
    text: `Kondisi internal paling dominan saat dorongan muncul adalah ${tagLabel} (${topPct}% dari faktor HALT tercatat). Memenuhi kebutuhan dasar fisik/emosi Anda sering kali langsung meredakan dorongan tersebut.`,
    evidence: {
      totalEvents: events.length,
      daysTracked,
      sampleSize: totalHalt,
      details: { breakdown: counts, dominant: topTag, percentage: topPct },
    },
  };
}

/**
 * Langkah 4.1: Korelasi Suasana Hati / Mood (Dengan disclaimer non-kausalitas ketat)
 */
export function computeMoodCorrelation(
  events: HabitEventInsightInput[],
  checkins?: HabitCheckinInsightInput[],
  daysTracked = 14
): HabitInsight | null {
  const urgeMoods: number[] = [];
  for (const e of events) {
    if ((e.kind === "URGE" || e.kind === "LAPSE") && typeof e.mood === "number") {
      urgeMoods.push(e.mood);
    }
  }

  if (urgeMoods.length < 5) return null;

  const avgUrgeMood = urgeMoods.reduce((a, b) => a + b, 0) / urgeMoods.length;

  let checkinAvgMood: number | null = null;
  if (checkins && checkins.length >= 5) {
    const validCheckinMoods = checkins
      .filter((c) => typeof c.mood === "number" && c.status === "CONFIRMED_CLEAN")
      .map((c) => c.mood as number);
    if (validCheckinMoods.length >= 3) {
      checkinAvgMood = validCheckinMoods.reduce((a, b) => a + b, 0) / validCheckinMoods.length;
    }
  }

  let text = `Rata-rata tingkat suasana hati saat dorongan muncul adalah ${avgUrgeMood.toFixed(1)}/5.`;
  if (checkinAvgMood !== null) {
    text += ` Sebagai perbandingan, rata-rata suasana hati saat hari bebas adalah ${checkinAvgMood.toFixed(1)}/5.`;
  }
  text += " (Catatan: Ini adalah korelasi statistik, bukan bukti sebab-akibat langsung).";

  return {
    kind: "MOOD_CORRELATION",
    title: "Korelasi Suasana Hati (Korelasi, Bukan Sebab-Akibat)",
    text,
    evidence: {
      totalEvents: events.length,
      daysTracked,
      sampleSize: urgeMoods.length,
      details: {
        avgUrgeMood: Number(avgUrgeMood.toFixed(2)),
        checkinAvgMood: checkinAvgMood !== null ? Number(checkinAvgMood.toFixed(2)) : null,
      },
    },
  };
}

/**
 * Langkah 4.1: Durasi dorongan (Urge Duration)
 */
export function computeUrgeDuration(
  events: HabitEventInsightInput[],
  daysTracked = 14
): HabitInsight | null {
  const durations: number[] = [];
  for (const e of events) {
    if (e.kind === "URGE" && typeof e.durationMinutes === "number" && e.durationMinutes > 0) {
      durations.push(e.durationMinutes);
    }
  }

  if (durations.length < 3) return null;

  const avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  const maxDuration = Math.max(...durations);

  return {
    kind: "URGE_DURATION",
    title: "Durasi Gelombang Dorongan",
    text: `Rata-rata dorongan berlalu dalam waktu sekitar ${avgDuration} menit (terlama ${maxDuration} menit). Mengingat bahwa dorongan hanya berupa gelombang sementara (teknik Urge Surfing) terbukti efektif membantu melewatinya.`,
    evidence: {
      totalEvents: events.length,
      daysTracked,
      sampleSize: durations.length,
      details: { avgMinutes: avgDuration, maxMinutes: maxDuration },
    },
  };
}

/**
 * Langkah 4.1: Efektivitas Rencana Penanganan / Coping Plan
 */
export function computePlanEffectiveness(
  events: HabitEventInsightInput[],
  daysTracked = 14
): HabitInsight | null {
  const planStats = new Map<string, { title: string; used: number; success: number }>();
  let totalPlanUses = 0;

  for (const e of events) {
    if (e.copingPlanId && typeof e.copingPlanSuccess === "boolean") {
      totalPlanUses++;
      const title = e.copingPlanTitle || "Rencana Penanganan";
      const cur = planStats.get(e.copingPlanId) || { title, used: 0, success: 0 };
      cur.used++;
      if (e.copingPlanSuccess) cur.success++;
      planStats.set(e.copingPlanId, cur);
    }
  }

  if (totalPlanUses < 3) return null;

  const validPlans = Array.from(planStats.values()).filter((p) => p.used >= 2);
  if (validPlans.length === 0) return null;

  // Cari rencana dengan tingkat keberhasilan tertinggi
  validPlans.sort((a, b) => b.success / b.used - a.success / a.used);
  const best = validPlans[0];
  const successPct = Math.round((best.success / best.used) * 100);

  return {
    kind: "PLAN_EFFECTIVENESS",
    title: "Efektivitas Rencana Penanganan",
    text: `Rencana "${best.title}" berhasil membantu meredakan dorongan pada ${successPct}% kesempatan (${best.success} dari ${best.used} kali digunakan).`,
    evidence: {
      totalEvents: events.length,
      daysTracked,
      sampleSize: totalPlanUses,
      details: { planTitle: best.title, used: best.used, success: best.success, successRate: successPct },
    },
  };
}

/**
 * Langkah 4.1: Edukasi Lonjakan Awal (Extinction Burst)
 */
export function computeEarlyBurstEducation(
  events: HabitEventInsightInput[],
  daysTracked: number
): HabitInsight | null {
  // Hanya relevan jika hari pelacakan masih di fase awal (antara 7 hingga 30 hari)
  if (daysTracked < 7 || daysTracked > 35) return null;

  const relevant = events.filter((e) => e.kind === "URGE" || e.kind === "LAPSE");
  if (relevant.length < 5) return null;

  return {
    kind: "EARLY_BURST_EDUCATION",
    title: "Edukasi Fase Adaptasi Otak (Extinction Burst)",
    text: "Jika Anda merasakan dorongan terasa lebih kuat atau sering di minggu-minggu awal, ini adalah fenomena biologis alami yang disebut 'Extinction Burst'. Otak sedang menguji apakah kebiasaan lama benar-benar ditinggalkan. Ini adalah pertanda bahwa proses perubahan sedang berjalan, bukan kemunduran.",
    evidence: {
      totalEvents: events.length,
      daysTracked,
      sampleSize: relevant.length,
      details: { daysTracked, phase: "EARLY_ADAPTATION" },
    },
  };
}

/**
 * Mesin Utama Penemu Pola dan Insight (Pure Engine)
 */
export function computeHabitInsights({
  startedAt,
  now = new Date(),
  timezone = "Asia/Jakarta",
  events,
  checkins = [],
}: ComputeInsightsOptions): InsightsResult {
  const daysTracked = getDaysTracked(startedAt, now);
  const relevantEvents = getRelevantEvents(events);
  const heatmap = buildHeatmap(relevantEvents, timezone);

  const hasSufficientData =
    daysTracked >= MIN_DAYS_THRESHOLD && relevantEvents.length >= MIN_EVENTS_THRESHOLD;

  if (!hasSufficientData) {
    return {
      hasSufficientData: false,
      threshold: {
        requiredDays: MIN_DAYS_THRESHOLD,
        actualDays: daysTracked,
        requiredEvents: MIN_EVENTS_THRESHOLD,
        actualEvents: relevantEvents.length,
      },
      insights: [],
      heatmap,
    };
  }

  const insights: HabitInsight[] = [];

  const riskWindows = computeRiskWindows(relevantEvents, now, timezone, daysTracked);
  if (riskWindows) insights.push(riskWindows);

  const riskDays = computeRiskDays(relevantEvents, timezone, daysTracked);
  if (riskDays) insights.push(riskDays);

  const topTriggers = computeTopTriggers(relevantEvents, daysTracked);
  if (topTriggers) insights.push(topTriggers);

  const haltShare = computeHaltShare(relevantEvents, daysTracked);
  if (haltShare) insights.push(haltShare);

  const moodCorrelation = computeMoodCorrelation(relevantEvents, checkins, daysTracked);
  if (moodCorrelation) insights.push(moodCorrelation);

  const urgeDuration = computeUrgeDuration(relevantEvents, daysTracked);
  if (urgeDuration) insights.push(urgeDuration);

  const planEffectiveness = computePlanEffectiveness(relevantEvents, daysTracked);
  if (planEffectiveness) insights.push(planEffectiveness);

  const earlyBurst = computeEarlyBurstEducation(relevantEvents, daysTracked);
  if (earlyBurst) insights.push(earlyBurst);

  return {
    hasSufficientData: true,
    threshold: {
      requiredDays: MIN_DAYS_THRESHOLD,
      actualDays: daysTracked,
      requiredEvents: MIN_EVENTS_THRESHOLD,
      actualEvents: relevantEvents.length,
    },
    insights,
    heatmap,
  };
}
