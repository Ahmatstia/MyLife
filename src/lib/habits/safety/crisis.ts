/**
 * Deteksi kata kunci krisis pada catatan (desain §14.3):
 * Aturan sederhana dan konservatif untuk mendeteksi sinyal kedaruratan/krisis.
 * Hasil deteksi HANYA digunakan untuk menampilkan sumber bantuan darurat,
 * TIDAK PERNAH disimpan sebagai diagnosis medis atau label pengguna.
 */

const CRISIS_PATTERNS: readonly RegExp[] = [
  /\bbunuh\s*diri\b/i,
  /\bakhiri\s*hidup\b/i,
  /\bmengakhiri\s*hidup\b/i,
  /\bmenyakiti\s*diri\b/i,
  /\bmelukai\s*diri\b/i,
  /\bself[-\s]*harm\b/i,
  /\bsuicide\b/i,
  /\bsuicidal\b/i,
  /\btidak\s*ingin\s*hidup\b/i,
  /\bingin\s*mati\b/i,
  /\bmau\s*mati\b/i,
];

export function detectCrisisKeywords(text: string | null | undefined): boolean {
  if (!text || typeof text !== "string") {
    return false;
  }
  const clean = text.trim();
  if (clean.length === 0) {
    return false;
  }

  return CRISIS_PATTERNS.some((pattern) => pattern.test(clean));
}
