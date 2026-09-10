import type { Entity } from "../intents";
import { normalizeText } from "../normalization";

export function extractEntitiesV2(text: string): Entity[] {
  const norm = normalizeText(text);
  const entities: Entity[] = [];
  const add = (value: string, type: Entity["type"], metadata?: Record<string, unknown>) => {
    if (value && !entities.some((e) => e.type === type && e.value === value)) {
      entities.push({ value: value.trim(), type, metadata });
    }
  };

  // 1. Goal extraction
  const goalQuotes = text.match(/(?:goal|tujuan|target)\s+["']([^"']+)["']/i);
  if (goalQuotes) {
    add(goalQuotes[1], "GOAL");
  } else {
    const goalRegex = /(?:buat|tambah|hapus|delete|status|progres|lihat)\s+goal\s+(?:baru\s+)?(?:tentang\s+|untuk\s+)?([a-z0-9][a-z0-9 -]{1,40}?)(?=\s+(?:dan|lalu|kemudian|di|pada|minggu|hari|bulan|sekarang|ya|saya|$))/i;
    const goalMatch = norm.match(goalRegex);
    if (goalMatch) add(goalMatch[1], "GOAL");
  }

  // 2. Stage extraction
  const stageQuotes = text.match(/(?:stage|tahap|fase)\s+["']([^"']+)["']/i);
  if (stageQuotes) {
    add(stageQuotes[1], "STAGE");
  } else {
    const stageRegex = /(?:stage|tahap|fase)\s+([a-z0-9][a-z0-9 -]{1,40}?)(?=\s+(?:di|pada|dan|lalu|kemudian|untuk|$))/i;
    const stageMatch = norm.match(stageRegex);
    if (stageMatch) add(stageMatch[1], "STAGE");
  }

  // 3. Task extraction
  const taskQuotes = text.match(/(?:task|tugas|pekerjaan)\s+["']([^"']+)["']/i);
  if (taskQuotes) {
    add(taskQuotes[1], "TASK");
  } else {
    const taskRegex = /(?:task|tugas|pekerjaan)\s+([a-z0-9][a-z0-9 -]{1,60}?)(?=\s+(?:di|pada|hari|besok|lusa|jam|pukul|nanti|selama|sekarang|ya|saya|dengan|untuk|dan|lalu|$))/i;
    const taskMatch = norm.match(taskRegex);
    if (taskMatch) add(taskMatch[1], "TASK");
  }

  // 4. Temporal / Date
  if (/hari ini|sekarang|today/.test(norm)) add("today", "DATE");
  if (/besok|tomorrow/.test(norm)) add("tomorrow", "DATE");
  if (/kemarin|yesterday/.test(norm)) add("yesterday", "DATE");
  if (/minggu ini|this week/.test(norm)) add("this_week", "DATE");
  if (/minggu depan|next week/.test(norm)) add("next_week", "DATE");
  if (/minggu lalu|last week/.test(norm)) add("last_week", "DATE");

  // 5. Duration
  const durationMatch = norm.match(/\b(\d+(?:[.,]\d+)?)\s*(jam|menit|m|mnt)\b/);
  if (durationMatch) add(durationMatch[0], "DURATION");

  // 6. Priority
  for (const priority of ["tinggi", "sedang", "rendah", "high", "medium", "low"]) {
    if (new RegExp(`\\b${priority}\\b`).test(norm)) add(priority, "PRIORITY");
  }

  // 7. Status
  for (const status of ["selesai", "belum selesai", "berjalan", "aktif", "dijeda", "tuntas"]) {
    if (new RegExp(`\\b${status}\\b`).test(norm)) add(status, "STATUS");
  }

  // 8. Count / Quantity (e.g. "3 task", "5 task")
  const countMatch = norm.match(/\b(\d+)\s+(?:task|tugas|buah|stage)\b/i);
  if (countMatch) {
    add(countMatch[1], "COUNT", { count: parseInt(countMatch[1], 10) });
  }

  // 9. Direction (for reorder: "ke atas", "ke bawah")
  if (/ke atas|naikkan|pindahkan ke atas/.test(norm)) add("up", "DIRECTION");
  if (/ke bawah|turunkan|pindahkan ke bawah/.test(norm)) add("down", "DIRECTION");

  return entities;
}
