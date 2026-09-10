/**
 * Ambient NLP Utility
 *
 * Lightweight, client-side zero-latency NLP for inline text inputs:
 * 1. Ambient task parsing (Today dashboard quick add)
 * 2. Ambient capture categorizer (Capture / Inbox quick add)
 */

export interface AmbientTaskMeta {
  detectedPriority?: {
    level: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    label: string;
    color: string;
  };
  detectedDate?: {
    label: string;
    isoDate: string;
  };
  detectedDuration?: {
    hours: number;
    label: string;
  };
  cleanTitle: string;
  hasAmbientData: boolean;
}

/**
 * Strip ambient keywords (dates, times, priorities, durations) from a task string.
 */
export function cleanAmbientTaskTitle(text: string): string {
  return text
    .replace(/\b(urgent|kritis|mendesak|mendadak|asap|penting|prioritas tinggi|prio tinggi|wajib|santai|prioritas rendah|prio rendah)\b/gi, "")
    .replace(/\b(selama\s+)?(\d+(?:[.,]\d+)?)\s*(jam|menit|m|mnt|h)\b/gi, "")
    .replace(/\b(setengah\s*jam|sejam)\b/gi, "")
    .replace(/\b(hari ini|besok|lusa|kemarin|minggu depan|minggu ini)\b/gi, "")
    .replace(/\b(hari\s+)?(senin|selasa|rabu|kamis|jumat|sabtu|minggu)\b/gi, "")
    .replace(/\bjam\s*(\d{1,2})(?:[:.](\d{2}))?\b/gi, "")
    .replace(/\b(\d{1,2})[:.](\d{2})\b/g, "")
    .replace(/\b(pagi|siang|sore|malam)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Parse inline task text for real-time ambient hints (priority, date, duration).
 */
export function parseAmbientTask(text: string): AmbientTaskMeta {
  const lower = text.toLowerCase().trim();
  const cleanTitle = cleanAmbientTaskTitle(text);
  if (!lower) {
    return { cleanTitle: "", hasAmbientData: false };
  }

  let detectedPriority: AmbientTaskMeta["detectedPriority"];
  let detectedDate: AmbientTaskMeta["detectedDate"];
  let detectedDuration: AmbientTaskMeta["detectedDuration"];

  // Priority detection
  if (/\b(urgent|kritis|mendesak|mendadak|asap)\b/i.test(lower)) {
    detectedPriority = { level: "URGENT", label: "Mendesak", color: "text-red-400 bg-red-500/10 border-red-500/20" };
  } else if (/\b(penting|high|prioritas tinggi|prio tinggi|wajib)\b/i.test(lower)) {
    detectedPriority = { level: "HIGH", label: "Penting", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
  } else if (/\b(santai|low|prioritas rendah|prio rendah)\b/i.test(lower)) {
    detectedPriority = { level: "LOW", label: "Santai", color: "text-slate-400 bg-slate-500/10 border-slate-500/20" };
  }

  // Duration detection
  if (/\b(15\s*m(enit)?)\b/i.test(lower)) {
    detectedDuration = { hours: 0.25, label: "15 Menit" };
  } else if (/\b(30\s*m(enit)?|setengah\s*jam)\b/i.test(lower)) {
    detectedDuration = { hours: 0.5, label: "30 Menit" };
  } else if (/\b(45\s*m(enit)?)\b/i.test(lower)) {
    detectedDuration = { hours: 0.75, label: "45 Menit" };
  } else if (/\b(1\s*jam|1h|sejam)\b/i.test(lower)) {
    detectedDuration = { hours: 1, label: "1 Jam" };
  } else if (/\b(2\s*jam|2h)\b/i.test(lower)) {
    detectedDuration = { hours: 2, label: "2 Jam" };
  } else if (/\b(3\s*jam|3h)\b/i.test(lower)) {
    detectedDuration = { hours: 3, label: "3 Jam" };
  }

  // Date detection
  const now = new Date();
  let targetDate: Date | null = null;
  let dateLabel = "";

  if (/\blusa\b/i.test(lower)) {
    targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
    dateLabel = "Lusa";
  } else if (/\bbesok\b/i.test(lower)) {
    targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    dateLabel = "Besok";
  } else if (/\bhari ini\b/i.test(lower)) {
    targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    dateLabel = "Hari Ini";
  } else {
    // Check days of week
    const daysMap: Record<string, number> = {
      minggu: 0,
      senin: 1,
      selasa: 2,
      rabu: 3,
      kamis: 4,
      jumat: 5,
      sabtu: 6,
    };
    for (const [dayName, dayIndex] of Object.entries(daysMap)) {
      const regex = new RegExp(`\\b(hari\\s+)?${dayName}\\b`, "i");
      if (regex.test(lower)) {
        const currentDay = now.getDay();
        let daysAhead = (dayIndex - currentDay + 7) % 7;
        if (daysAhead === 0) daysAhead = 7; // next week's day
        targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysAhead);
        dateLabel = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        break;
      }
    }
  }

  // Time detection to accompany date
  if (targetDate) {
    let hour = 17; // default end of day
    let minute = 0;

    const timeMatch = lower.match(/\bjam\s*(\d{1,2})(?:[:.](\d{2}))?\b/i) ||
                      lower.match(/\b(\d{1,2})[:.](\d{2})\b/);
    if (timeMatch) {
      hour = parseInt(timeMatch[1], 10);
      minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      if (hour >= 1 && hour <= 6 && !/\b(pagi|subuh)\b/i.test(lower)) {
        hour += 12;
      }
      dateLabel += ` ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    } else if (/\bpagi\b/i.test(lower)) {
      hour = 9;
      dateLabel += " 09:00";
    } else if (/\bsiang\b/i.test(lower)) {
      hour = 13;
      dateLabel += " 13:00";
    } else if (/\bsore\b/i.test(lower)) {
      hour = 16;
      dateLabel += " 16:00";
    } else if (/\bmalam\b/i.test(lower)) {
      hour = 20;
      dateLabel += " 20:00";
    }

    targetDate.setHours(hour, minute, 0, 0);
    detectedDate = {
      label: dateLabel,
      isoDate: targetDate.toISOString(),
    };
  }

  const hasAmbientData = Boolean(detectedPriority || detectedDate || detectedDuration);

  return {
    detectedPriority,
    detectedDate,
    detectedDuration,
    cleanTitle,
    hasAmbientData,
  };
}

export type CaptureCategory = "TASK_CANDIDATE" | "IDEA" | "NOTE" | "REMINDER";

export interface AmbientCaptureMeta {
  suggestedCategory: CaptureCategory;
  label: string;
  icon: string;
  confidence: number;
}

/**
 * Predict capture category in real-time from quick note text.
 */
export function parseAmbientCapture(text: string): AmbientCaptureMeta {
  const lower = text.toLowerCase().trim();
  if (!lower) {
    return {
      suggestedCategory: "TASK_CANDIDATE",
      label: "Tugas",
      icon: "checkSquare",
      confidence: 0.5,
    };
  }

  // Reminder cues
  if (/\b(ingat|ingatkan|jangan lupa|deadline|besok|jam|reminder)\b/i.test(lower)) {
    return {
      suggestedCategory: "REMINDER",
      label: "Pengingat",
      icon: "bell",
      confidence: 0.85,
    };
  }

  // Idea cues
  if (/\b(ide|bagaimana kalau|inovasi|konsep|coba kalau|pikiran|terpikir|prospek)\b/i.test(lower)) {
    return {
      suggestedCategory: "IDEA",
      label: "Ide",
      icon: "sparkles",
      confidence: 0.85,
    };
  }

  // Note cues
  if (/\b(catat|catatan|ringkasan|referensi|kutipan|note|link|url|bacaan|rangkuman)\b/i.test(lower)) {
    return {
      suggestedCategory: "NOTE",
      label: "Catatan",
      icon: "bookOpen",
      confidence: 0.8,
    };
  }

  // Task cues (action verbs)
  if (
    /^(buat|bikin|kerjakan|kirim|beli|hubungi|chat|baca|selesaikan|bayar|telepon|perbaiki|tulis|review|cek|update)\b/i.test(lower) ||
    /\b(harus|wajib|perlu)\s+(dikerjakan|dibuat|diselesaikan)\b/i.test(lower)
  ) {
    return {
      suggestedCategory: "TASK_CANDIDATE",
      label: "Tugas",
      icon: "checkSquare",
      confidence: 0.9,
    };
  }

  return {
    suggestedCategory: "TASK_CANDIDATE",
    label: "Tugas",
    icon: "checkSquare",
    confidence: 0.6,
  };
}
