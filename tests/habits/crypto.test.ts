import { describe, it, expect } from "vitest";
import crypto from "crypto";
import {
  encryptText,
  decryptText,
  HabitsCryptoError,
} from "@/lib/habits/safety/crypto";

describe("Habits V2 - Langkah 5.1: Enkripsi Level Aplikasi (AES-256-GCM)", () => {
  it("Round-trip: enkripsi dan dekripsi teks sensitif menghasilkan nilai asli", () => {
    const secret = "Ini catatan pribadi yang sangat rahasia tentang pemicu.";
    const encrypted = encryptText(secret);

    expect(encrypted).not.toBeNull();
    expect(encrypted).not.toBe(secret);
    expect(encrypted?.startsWith("v1:")).toBe(true);

    const decrypted = decryptText(encrypted);
    expect(decrypted).toBe(secret);
  });

  it("Backward Compatibility: data plaintext lama tanpa prefiks v1: dikembalikan apa adanya", () => {
    const oldPlaintext = "Catatan sebelum enkripsi diaktifkan";
    const result = decryptText(oldPlaintext);
    expect(result).toBe(oldPlaintext);
  });

  it("Menangani nilai null, undefined, dan string kosong dengan aman", () => {
    expect(encryptText(null)).toBeNull();
    expect(encryptText(undefined)).toBeNull();
    expect(encryptText("")).toBeNull();

    expect(decryptText(null)).toBeNull();
    expect(decryptText(undefined)).toBeNull();
    expect(decryptText("")).toBeNull();
  });

  it("Keamanan Kunci: mendekripsi dengan kunci berbeda melempar HabitsCryptoError(DECRYPT_FAILED)", () => {
    const keyA = crypto.randomBytes(32);
    const keyB = crypto.randomBytes(32);

    const secret = "Data penting";
    const encryptedWithA = encryptText(secret, keyA);

    expect(() => {
      decryptText(encryptedWithA, keyB);
    }).toThrow(HabitsCryptoError);

    try {
      decryptText(encryptedWithA, keyB);
    } catch (err) {
      expect((err as HabitsCryptoError).code).toBe("DECRYPT_FAILED");
    }
  });

  it("Idempotensi: teks yang sudah terenkripsi tidak dienkripsi ganda", () => {
    const secret = "Catatan rahasia";
    const encrypted1 = encryptText(secret);
    const encrypted2 = encryptText(encrypted1);

    expect(encrypted2).toBe(encrypted1);
  });
});
