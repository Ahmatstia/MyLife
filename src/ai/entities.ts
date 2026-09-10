import type { Entity } from "./intents";

export function extractEntities(text: string): Entity[] {
  text = text.toLocaleLowerCase("id-ID");
  const entities: Entity[] = [];
  const add = (value: string, type: Entity["type"]) => entities.push({ value, type });
  const goal = text.match(/(?:goal|progres|status|tentang)\s+([a-z0-9][a-z0-9 -]{1,40}?)(?=\s+(?:minggu|hari|bulan|sekarang|ya|saya|$))/i);
  if (goal) add(goal[1].trim(), "GOAL");
  const task = text.match(/(?:task|tugas|pekerjaan)\s+["']?([a-z0-9][a-z0-9 -]{1,60}?)["']?(?=\s+(?:hari|besok|lusa|jam|pukul|nanti|selama|sekarang|ya|saya|dengan|untuk|$))/i);
  if (task) add(task[1].trim(), "TASK");
  if (/hari ini|sekarang|today/.test(text)) add("today", "DATE");
  if (/besok|tomorrow/.test(text)) add("tomorrow", "DATE");
  if (/lusa/.test(text)) add("day_after_tomorrow", "DATE");
  if (/minggu ini/.test(text)) add("this_week", "DATE");
  if (/minggu lalu/.test(text)) add("last_week", "DATE");
  const duration = text.match(/\b(\d+(?:[.,]\d+)?)\s*(jam|menit|m)\b/);
  if (duration) add(duration[0], "DURATION");
  for (const priority of ["tinggi", "sedang", "rendah", "high", "medium", "low"]) if (text.includes(priority)) add(priority, "PRIORITY");
  for (const status of ["selesai", "belum selesai", "berjalan", "aktif"]) if (text.includes(status)) add(status, "STATUS");
  return entities;
}
