import type { TriggerCategory } from "@/generated/prisma/client";

export interface BuiltinTriggerDef {
  id: string;
  category: TriggerCategory;
  name: string;
  description: string;
}

/**
 * Pustaka pemicu bawaan global (userId: null) sesuai desain §F-B5.
 * Mencakup 8 kategori dan penanda HALT+B (Hungry, Angry, Lonely, Tired, Bored).
 */
export const BUILTIN_TRIGGERS: BuiltinTriggerDef[] = [
  // 1. EMOTION (termasuk HALT: Angry)
  {
    id: "builtin-trig-emo-angry",
    category: "EMOTION",
    name: "Marah / Frustrasi (HALT: Angry)",
    description: "Emosi marah atau jengkel setelah kejadian mengecewakan",
  },
  {
    id: "builtin-trig-emo-anxious",
    category: "EMOTION",
    name: "Cemas / Gelisah",
    description: "Perasaan khawatir, tegang, atau tidak tenang",
  },
  {
    id: "builtin-trig-emo-lonely",
    category: "EMOTION",
    name: "Kesepian / Terisolasi (HALT: Lonely)",
    description: "Merasa hampa, sendiri, atau tidak terhubung dengan orang lain",
  },
  {
    id: "builtin-trig-emo-stress",
    category: "EMOTION",
    name: "Stres / Kewalahan",
    description: "Tekanan tugas berat atau beban pikiran menumpuk",
  },
  {
    id: "builtin-trig-emo-sad",
    category: "EMOTION",
    name: "Sedih / Murung",
    description: "Perasaan down atau kehilangan semangat",
  },

  // 2. PHYSICAL (termasuk HALT+B: Hungry, Tired, Bored)
  {
    id: "builtin-trig-phy-hungry",
    category: "PHYSICAL",
    name: "Lapar / Haus (HALT: Hungry)",
    description: "Kadar gula darah rendah atau dehidrasi memicu impuls",
  },
  {
    id: "builtin-trig-phy-tired",
    category: "PHYSICAL",
    name: "Lelah / Kurang Tidur (HALT: Tired)",
    description: "Kelelahan fisik menurunkan kontrol diri dan kemauan",
  },
  {
    id: "builtin-trig-phy-bored",
    category: "PHYSICAL",
    name: "Bosan / Kurang Stimulasi (HALT+B: Bored)",
    description: "Pikiran mencari dopamin instan karena tidak ada kegiatan",
  },
  {
    id: "builtin-trig-phy-pain",
    category: "PHYSICAL",
    name: "Pegal / Nyeri Tubuh",
    description: "Rasa tidak nyaman di tubuh mencari pelarian",
  },

  // 3. TIME
  {
    id: "builtin-trig-time-morning",
    category: "TIME",
    name: "Bangun Pagi",
    description: "Saat baru bangun tidur sebelum memulai aktivitas",
  },
  {
    id: "builtin-trig-time-night",
    category: "TIME",
    name: "Larut Malam (>23:00)",
    description: "Waktu sepi ketika daya tahan mental melemah",
  },
  {
    id: "builtin-trig-time-afternoon",
    category: "TIME",
    name: "Sore Hari (Jam 15:00 - 17:00)",
    description: "Titik energi rendah di sela-sela jam kerja",
  },
  {
    id: "builtin-trig-time-weekend",
    category: "TIME",
    name: "Akhir Pekan / Hari Libur",
    description: "Waktu senggang tanpa struktur jadwal harian",
  },

  // 4. PLACE
  {
    id: "builtin-trig-place-bedroom",
    category: "PLACE",
    name: "Kamar Tidur Sendirian",
    description: "Ruang privat tertutup tanpa keberadaan orang lain",
  },
  {
    id: "builtin-trig-place-bathroom",
    category: "PLACE",
    name: "Kamar Mandi",
    description: "Ruang isolasi sesaat",
  },
  {
    id: "builtin-trig-place-desk",
    category: "PLACE",
    name: "Meja Kerja / Komputer",
    description: "Saat duduk lama di depan layar",
  },
  {
    id: "builtin-trig-place-cafe",
    category: "PLACE",
    name: "Kafe / Tempat Nongkrong",
    description: "Suasana sosial yang memicu kebiasaan tertentu",
  },

  // 5. PERSON
  {
    id: "builtin-trig-person-friends",
    category: "PERSON",
    name: "Bersama Teman Tertentu",
    description: "Tekanan teman sebaya atau kebiasaan bersama",
  },
  {
    id: "builtin-trig-person-alone",
    category: "PERSON",
    name: "Sendirian Tanpa Pengawasan",
    description: "Ketiadaan akuntabilitas eksternal",
  },
  {
    id: "builtin-trig-person-conflict",
    category: "PERSON",
    name: "Setelah Berdebat / Konflik",
    description: "Ketegangan hubungan yang belum terselesaikan",
  },

  // 6. ACTIVITY
  {
    id: "builtin-trig-act-afterwork",
    category: "ACTIVITY",
    name: "Selesai Mengerjakan Tugas Berat",
    description: "Mencari hadiah/reward instan setelah lelah",
  },
  {
    id: "builtin-trig-act-streaming",
    category: "ACTIVITY",
    name: "Menonton Video / Film",
    description: "Kebiasaan sampingan saat menonton",
  },
  {
    id: "builtin-trig-act-transit",
    category: "ACTIVITY",
    name: "Menunggu / Terjebak Macet",
    description: "Kebosanan saat waktu transit",
  },

  // 7. DEVICE
  {
    id: "builtin-trig-dev-notification",
    category: "DEVICE",
    name: "Melihat Notifikasi Tertentu",
    description: "Bunyi atau popup yang memicu dorongan impulsif",
  },
  {
    id: "builtin-trig-dev-doomscroll",
    category: "DEVICE",
    name: "Scroll Media Sosial Tanpa Tujuan",
    description: "Perilaku otomatis browsing di ponsel",
  },

  // 8. OTHER
  {
    id: "builtin-trig-oth-scent",
    category: "OTHER",
    name: "Mencium Aroma / Suara Pemicu",
    description: "Stimulus sensorik yang mengaktifkan memori kebiasaan",
  },
  {
    id: "builtin-trig-oth-celebration",
    category: "OTHER",
    name: "Perayaan / Hadiah Diri",
    description: "Rasionalisasi merayakan sesuatu dengan kebiasaan lama",
  },
];

/**
 * Menyemai (seed) pustaka pemicu bawaan secara idempoten.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedBuiltinTriggers(db: any): Promise<number> {
  let count = 0;
  for (const trigger of BUILTIN_TRIGGERS) {
    await db.trigger.upsert({
      where: { id: trigger.id },
      update: {
        category: trigger.category,
        name: trigger.name,
        description: trigger.description,
      },
      create: {
        id: trigger.id,
        userId: null,
        category: trigger.category,
        name: trigger.name,
        description: trigger.description,
      },
    });
    count++;
  }
  return count;
}
