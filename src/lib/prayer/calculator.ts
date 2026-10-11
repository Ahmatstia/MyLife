import { Coordinates, CalculationMethod, PrayerTimes } from "adhan";
import { IndonesianCity } from "./cities";

export interface PrayerItem {
  id: "imsak" | "subuh" | "terbit" | "dhuha" | "dzuhur" | "ashar" | "maghrib" | "isya";
  name: string;
  time: Date;
  timeStr: string; // HH:mm
  isFardhu: boolean;
  icon: string;
}

export interface DailyPrayerSchedule {
  date: Date;
  city: IndonesianCity;
  items: PrayerItem[];
  imsak: PrayerItem;
  subuh: PrayerItem;
  terbit: PrayerItem;
  dhuha: PrayerItem;
  dzuhur: PrayerItem;
  ashar: PrayerItem;
  maghrib: PrayerItem;
  isya: PrayerItem;
}

export interface NextPrayerInfo {
  currentPrayer: PrayerItem | null;
  nextPrayer: PrayerItem;
  diffSeconds: number;
  countdownStr: string; // "01:24:10"
  isImminent: boolean; // <= 15 minutes
  progressPercent: number; // 0 - 100 progress between current and next
}

/**
 * Format a Date to HH:mm string using city's specific timezone.
 */
export function formatPrayerTime(date: Date, timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone,
    });
    return formatter.format(date).replace(".", ":");
  } catch {
    // Fallback to local time formatting
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
}

/**
 * Create CalculationParameters matching Kemenag RI / MABIMS standards:
 * - Fajr angle: 20°
 * - Isha angle: 18°
 * - Ihtiyath (safety margin): +2 minutes
 */
function getKemenagParams() {
  const params = CalculationMethod.Singapore();
  params.fajrAngle = 20;
  params.ishaAngle = 18;

  // Ihtiyath +2 minutes standard Kemenag RI
  params.adjustments.fajr = 2;
  params.adjustments.sunrise = -2;
  params.adjustments.dhuhr = 2;
  params.adjustments.asr = 2;
  params.adjustments.maghrib = 2;
  params.adjustments.isha = 2;

  return params;
}

/**
 * Compute the prayer schedule for a specific date and city.
 */
export function calculatePrayerSchedule(date: Date, city: IndonesianCity): DailyPrayerSchedule {
  const coordinates = new Coordinates(city.latitude, city.longitude);
  const params = getKemenagParams();
  const prayerTimes = new PrayerTimes(coordinates, date, params);

  const subuhDate = prayerTimes.fajr;
  const terbitDate = prayerTimes.sunrise;
  const dzuhurDate = prayerTimes.dhuhr;
  const asharDate = prayerTimes.asr;
  const maghribDate = prayerTimes.maghrib;
  const isyaDate = prayerTimes.isha;

  // Imsak = 10 minutes before Subuh
  const imsakDate = new Date(subuhDate.getTime() - 10 * 60 * 1000);

  // Dhuha = ~25 minutes after Terbit
  const dhuhaDate = new Date(terbitDate.getTime() + 25 * 60 * 1000);

  const tz = city.timezone;

  const imsak: PrayerItem = {
    id: "imsak",
    name: "Imsak",
    time: imsakDate,
    timeStr: formatPrayerTime(imsakDate, tz),
    isFardhu: false,
    icon: "hourglass_top",
  };

  const subuh: PrayerItem = {
    id: "subuh",
    name: "Subuh",
    time: subuhDate,
    timeStr: formatPrayerTime(subuhDate, tz),
    isFardhu: true,
    icon: "wb_twilight",
  };

  const terbit: PrayerItem = {
    id: "terbit",
    name: "Terbit",
    time: terbitDate,
    timeStr: formatPrayerTime(terbitDate, tz),
    isFardhu: false,
    icon: "wb_sunny",
  };

  const dhuha: PrayerItem = {
    id: "dhuha",
    name: "Dhuha",
    time: dhuhaDate,
    timeStr: formatPrayerTime(dhuhaDate, tz),
    isFardhu: false,
    icon: "sunny",
  };

  const dzuhur: PrayerItem = {
    id: "dzuhur",
    name: "Dzuhur",
    time: dzuhurDate,
    timeStr: formatPrayerTime(dzuhurDate, tz),
    isFardhu: true,
    icon: "wb_sunny",
  };

  const ashar: PrayerItem = {
    id: "ashar",
    name: "Ashar",
    time: asharDate,
    timeStr: formatPrayerTime(asharDate, tz),
    isFardhu: true,
    icon: "wb_twilight",
  };

  const maghrib: PrayerItem = {
    id: "maghrib",
    name: "Maghrib",
    time: maghribDate,
    timeStr: formatPrayerTime(maghribDate, tz),
    isFardhu: true,
    icon: "nights_stay",
  };

  const isya: PrayerItem = {
    id: "isya",
    name: "Isya",
    time: isyaDate,
    timeStr: formatPrayerTime(isyaDate, tz),
    isFardhu: true,
    icon: "bedtime",
  };

  const items = [imsak, subuh, terbit, dhuha, dzuhur, ashar, maghrib, isya];

  return {
    date,
    city,
    items,
    imsak,
    subuh,
    terbit,
    dhuha,
    dzuhur,
    ashar,
    maghrib,
    isya,
  };
}

/**
 * Determine current prayer, next prayer, and live countdown.
 */
export function getNextPrayerInfo(now: Date, schedule: DailyPrayerSchedule): NextPrayerInfo {
  const nowMs = now.getTime();

  // Fardhu and primary sequence for transition
  const sequence = [
    schedule.subuh,
    schedule.terbit,
    schedule.dzuhur,
    schedule.ashar,
    schedule.maghrib,
    schedule.isya,
  ];

  let currentPrayer: PrayerItem | null = null;
  let nextPrayer: PrayerItem | null = null;
  let previousPrayerTimeMs = schedule.isya.time.getTime() - 24 * 60 * 60 * 1000;

  for (let i = 0; i < sequence.length; i++) {
    const item = sequence[i];
    const itemMs = item.time.getTime();

    if (nowMs < itemMs) {
      nextPrayer = item;
      currentPrayer = i > 0 ? sequence[i - 1] : schedule.isya;
      previousPrayerTimeMs = i > 0 ? sequence[i - 1].time.getTime() : schedule.isya.time.getTime() - 24 * 60 * 60 * 1000;
      break;
    }
  }

  // If passed Isya today, next is Subuh tomorrow
  if (!nextPrayer) {
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowSchedule = calculatePrayerSchedule(tomorrow, schedule.city);
    nextPrayer = tomorrowSchedule.subuh;
    currentPrayer = schedule.isya;
    previousPrayerTimeMs = schedule.isya.time.getTime();
  }

  const diffMs = Math.max(0, nextPrayer.time.getTime() - nowMs);
  const diffSeconds = Math.floor(diffMs / 1000);

  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;

  const countdownStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // Calculate progress percentage between previous and next prayer
  const totalSpanMs = Math.max(1, nextPrayer.time.getTime() - previousPrayerTimeMs);
  const elapsedMs = Math.max(0, nowMs - previousPrayerTimeMs);
  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedMs / totalSpanMs) * 100)));

  return {
    currentPrayer,
    nextPrayer,
    diffSeconds,
    countdownStr,
    isImminent: diffSeconds <= 15 * 60, // 15 mins or less
    progressPercent,
  };
}
