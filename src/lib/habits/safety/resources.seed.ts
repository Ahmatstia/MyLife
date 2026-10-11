export interface VerifiedSupportResourceSeed {
  country: string;
  category: "CRISIS" | "MENTAL_HEALTH" | "SUBSTANCE" | "GAMBLING" | "GENERAL";
  name: string;
  contact: string;
  description: string;
  sourceUrl: string;
  verifiedAt: Date;
}

export const VERIFIED_SUPPORT_RESOURCES: readonly VerifiedSupportResourceSeed[] = [
  {
    country: "ID",
    category: "CRISIS",
    name: "Layanan Kesehatan Jiwa SEJIWA (Kemenkes RI)",
    contact: "119 (ekstensi 8)",
    description: "Layanan dukungan psikologis dan kedaruratan kesehatan jiwa resmi Kementerian Kesehatan Republik Indonesia.",
    sourceUrl: "https://sejiwa.kemkes.go.id",
    verifiedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  {
    country: "ID",
    category: "GENERAL",
    name: "Halo Kemenkes",
    contact: "1500567",
    description: "Pusat kontak informasi dan rujukan kedaruratan medis Kementerian Kesehatan Republik Indonesia.",
    sourceUrl: "https://kemkes.go.id",
    verifiedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  {
    country: "ID",
    category: "MENTAL_HEALTH",
    name: "Yayasan Pulih",
    contact: "+62 811-8436-633",
    description: "Konseling kesehatan psikologis dan pendampingan trauma oleh tenaga profesional.",
    sourceUrl: "https://yayasanpulih.org",
    verifiedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  {
    country: "ID",
    category: "SUBSTANCE",
    name: "Layanan Rehabilitasi & Konseling BNN",
    contact: "184",
    description: "Pusat bantuan informasi, konseling, dan rehabilitasi ketergantungan zat adiktif Badan Narkotika Nasional.",
    sourceUrl: "https://bnn.go.id",
    verifiedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  {
    country: "ID",
    category: "GAMBLING",
    name: "Aduan & Bantuan Pencegahan Judi Online (Kominfo)",
    contact: "+62 811-9224-545",
    description: "Kanal aduan, bantuan pemulihan, dan pencegahan kecanduan judi daring resmi.",
    sourceUrl: "https://aduankonten.id",
    verifiedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
];
