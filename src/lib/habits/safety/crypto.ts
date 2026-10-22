import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const CURRENT_KEY_VERSION = "v1";
const IV_LENGTH = 12; // 96-bit IV standar untuk GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

export class HabitsCryptoError extends Error {
  constructor(message: string, public readonly code: "KEY_MISSING" | "DECRYPT_FAILED") {
    super(message);
    this.name = "HabitsCryptoError";
  }
}

/**
 * Mendapatkan kunci enkripsi 32-byte (256-bit)
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.HABITS_ENC_KEY;
  if (!envKey) {
    // Fallback default dev/test key deterministik bila belum disetel di env
    return crypto.createHash("sha256").update("mylife-default-habits-dev-enc-key-32b").digest();
  }

  // Jika kunci hex 64 karakter
  if (/^[0-9a-fA-F]{64}$/.test(envKey)) {
    return Buffer.from(envKey, "hex");
  }

  // Hash string apa pun menjadi tepat 32 bytes
  return crypto.createHash("sha256").update(envKey).digest();
}

/**
 * Enkripsi teks dengan AES-256-GCM
 * Format hasil: v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>
 */
export function encryptText(plainText: string | null | undefined, customKey?: Buffer): string | null {
  if (plainText === null || plainText === undefined || plainText === "") {
    return null;
  }

  // Jika sudah terenkripsi, jangan enkripsi ulang
  if (plainText.startsWith("v1:")) {
    return plainText;
  }

  const key = customKey || getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${CURRENT_KEY_VERSION}:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Dekripsi teks AES-256-GCM
 * Jika teks belum berformat enkripsi (plaintext lama), kembalikan teks asli (backward-compat)
 */
export function decryptText(cipherText: string | null | undefined, customKey?: Buffer): string | null {
  if (cipherText === null || cipherText === undefined || cipherText === "") {
    return null;
  }

  // Jika tidak memiliki prefiks versi, artinya data plaintext lama
  if (!cipherText.startsWith("v1:")) {
    return cipherText;
  }

  const parts = cipherText.split(":");
  if (parts.length !== 4) {
    return cipherText;
  }

  const [, ivHex, tagHex, encryptedHex] = parts;

  try {
    const key = customKey || getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(tagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch {
    throw new HabitsCryptoError(
      "Gagal mendekripsi data catatan sensitif. Pastikan kunci enkripsi HABITS_ENC_KEY sesuai.",
      "DECRYPT_FAILED"
    );
  }
}
