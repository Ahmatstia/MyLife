import { DateTime } from "luxon";
import { HabitReminderKind } from "@/generated/prisma/client";

export const DEFAULT_QUIET_START = "22:00";
export const DEFAULT_QUIET_END = "06:00";
export const MAX_DAILY_NOTIFICATIONS_LIMIT = 4;

/**
 * Memeriksa apakah suatu waktu lokal ("HH:mm") berada dalam rentang jam tenang (misal 22:00 s/d 06:00)
 */
export function isInQuietHours(
  localTime: string,
  quietStart = DEFAULT_QUIET_START,
  quietEnd = DEFAULT_QUIET_END
): boolean {
  const [h, m] = localTime.split(":").map(Number);
  const currentMinutes = h * 60 + m;

  const [startH, startM] = quietStart.split(":").map(Number);
  const startMinutes = startH * 60 + startM;

  const [endH, endM] = quietEnd.split(":").map(Number);
  const endMinutes = endH * 60 + endM;

  if (startMinutes > endMinutes) {
    // Melewati tengah malam (misal 22:00 s/d 06:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  } else {
    // Rentang biasa dalam hari yang sama
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
}

/**
 * Menghitung waktu tembak berikutnya untuk pengingat berdasarkan hari dan jam lokal
 */
export function computeNextReminderFireAt(
  localTime: string,
  daysOfWeek: number[] = [], // 1=Senin .. 7=Minggu
  timezone = "Asia/Jakarta",
  fromDate = new Date()
): Date {
  const [h, m] = localTime.split(":").map(Number);
  let dt = DateTime.fromJSDate(fromDate, { zone: timezone }).set({
    hour: h,
    minute: m,
    second: 0,
    millisecond: 0,
  });

  // Jika waktu hari ini sudah lewat, mulai cari dari hari esok
  if (dt.toJSDate().getTime() <= fromDate.getTime()) {
    dt = dt.plus({ days: 1 });
  }

  // Jika daysOfWeek kosong, artinya berulang setiap hari
  if (daysOfWeek.length === 0) {
    return dt.toJSDate();
  }

  // Cari hari pertama yang cocok dalam daysOfWeek
  for (let i = 0; i < 7; i++) {
    if (daysOfWeek.includes(dt.weekday)) {
      return dt.toJSDate();
    }
    dt = dt.plus({ days: 1 });
  }

  return dt.toJSDate();
}

/**
 * Menghitung waktu pengingat jendela rawan (15–30 menit sebelum jam rawan dimulai)
 */
export function computeRiskWindowReminderTime(
  riskHour: number,
  leadMinutes = 30
): { hour: number; minute: number; localTime: string } {
  let targetHour = riskHour;
  let targetMinute = 60 - leadMinutes;

  if (targetMinute === 60) {
    targetMinute = 0;
  } else {
    targetHour = (targetHour - 1 + 24) % 24;
  }

  const hStr = targetHour.toString().padStart(2, "0");
  const mStr = targetMinute.toString().padStart(2, "0");

  return {
    hour: targetHour,
    minute: targetMinute,
    localTime: `${hStr}:${mStr}`,
  };
}

/**
 * Format teks pengingat ramah dan netral dengan mematuhi privasi
 */
export function formatNeutralReminderText(
  kind: HabitReminderKind,
  habit: {
    name: string;
    displayAlias?: string | null;
    privacyLevel: number;
  }
): { title: string; body: string } {
  const isPrivate = habit.privacyLevel >= 1;
  const isAnonymous = habit.privacyLevel === 2;
  const displayName = isAnonymous
    ? habit.displayAlias || "Kebiasaan Pribadi"
    : isPrivate
    ? "Kebiasaan Anda"
    : habit.name;

  switch (kind) {
    case HabitReminderKind.CHECKIN:
      return {
        title: "Saatnya Evaluasi Diri",
        body: isPrivate
          ? `Luangkan 1 menit untuk mencatat progres harian ${displayName} dengan jujur dan tenang.`
          : `Luangkan waktu sejenak untuk evaluasi harian "${displayName}".`,
      };

    case HabitReminderKind.RISK_WINDOW:
      return {
        title: "Peringatan Waspada & Ketenangan",
        body: isPrivate
          ? "Rentang waktu ini biasanya membutuhkan perhatian ekstra. Tarik napas perlahan dan siapkan rencana alternatif Anda."
          : `Waktu rawan untuk "${displayName}" mendekat. Siapkan langkah penanganan atau alihkan perhatian sejenak.`,
      };

    case HabitReminderKind.EVENING_REFLECTION:
      return {
        title: "Refleksi Malam Hari",
        body: "Bagaimana perasaan Anda hari ini? Ingatlah bahwa setiap langkah kecil adalah proses bertumbuh.",
      };

    case HabitReminderKind.WEEKLY_REVIEW:
      return {
        title: "Tinjauan Mingguan",
        body: "Lihat kembali perjalanan Anda minggu ini dengan penuh apresiasi tanpa rasa bersalah.",
      };

    case HabitReminderKind.ANCHOR:
      return {
        title: "Waktunya Menautkan Kebiasaan",
        body: isPrivate
          ? "Jangkar pemicu Anda telah tiba. Lakukan versi mini dari perilaku positif Anda."
          : `Setelah aktivitas pemicu, saatnya melakukan langkah kecil untuk "${displayName}".`,
      };

    default:
      return {
        title: "Pengingat Progres",
        body: "Tetap terhubung dengan komitmen dan tujuan Anda hari ini.",
      };
  }
}
