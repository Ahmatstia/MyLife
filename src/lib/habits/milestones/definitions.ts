export interface MilestoneDef {
  code: string;
  title: string;
  description: string;
  category: "STREAK" | "URGE" | "RECOVERY";
}

export const MILESTONE_DEFINITIONS: readonly MilestoneDef[] = [
  {
    code: "STREAK_1",
    title: "1 Hari Bersih Pertama",
    description: "Langkah pertama yang paling berani.",
    category: "STREAK",
  },
  {
    code: "STREAK_3",
    title: "3 Hari Penuh Keteguhan",
    description: "Membangun momentum pemulihan awal.",
    category: "STREAK",
  },
  {
    code: "STREAK_7",
    title: "1 Minggu Bersih",
    description: "Satu siklus mingguan berhasil dilewati.",
    category: "STREAK",
  },
  {
    code: "STREAK_14",
    title: "2 Minggu Konsisten",
    description: "Pola baru mulai berakar perlahan.",
    category: "STREAK",
  },
  {
    code: "STREAK_30",
    title: "1 Bulan Penuh Komitmen",
    description: "Tiga puluh hari menjaga janji pada diri sendiri.",
    category: "STREAK",
  },
  {
    code: "STREAK_60",
    title: "60 Hari Berkelanjutan",
    description: "Dua bulan ketahanan yang luar biasa.",
    category: "STREAK",
  },
  {
    code: "STREAK_90",
    title: "90 Hari Tonggak Emas",
    description: "Transformasi mendalam menuju babak baru.",
    category: "STREAK",
  },
  {
    code: "STREAK_180",
    title: "Setengah Tahun Bersih",
    description: "Enam bulan membuktikan kekuatan kendali diri.",
    category: "STREAK",
  },
  {
    code: "STREAK_365",
    title: "1 Tahun Ketahanan",
    description: "Satu tahun penuh babak kehidupan baru.",
    category: "STREAK",
  },
  {
    code: "FIRST_URGE_RESISTED",
    title: "Berselancar Pertama",
    description: "Berhasil melewati dorongan pertama tanpa menurutinya.",
    category: "URGE",
  },
  {
    code: "URGES_RESISTED_10",
    title: "10 Dorongan Berhasil Dilalui",
    description: "Membuktikan dorongan selalu naik lalu surut.",
    category: "URGE",
  },
  {
    code: "FIRST_DEBRIEF",
    title: "Refleksi Pembelajaran",
    description: "Menghadapi situasi secara jujur dan mengambil hikmah.",
    category: "RECOVERY",
  },
  {
    code: "RETURNED_AFTER_SLIP",
    title: "Bangkit Kembali",
    description: "Tidak menyerah setelah terpeleset, melanjutkan hari bersih.",
    category: "RECOVERY",
  },
];
