import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findUserById } from "@/repositories/user.repository";

export const SESSION_COOKIE = "ppos_session";
const SESSION_TTL = 60 * 60 * 24 * 30;

// Ephemeral, per-proses secret untuk development/test agar aplikasi tetap
// berjalan tanpa env, tetapi TIDAK pernah konstanta yang bisa ditebak.
const devSecret = `dev-${randomBytes(24).toString("hex")}`;

export function secret() {
  const configured = process.env.AUTH_SECRET?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET wajib dikonfigurasi sebelum menjalankan production.");
  return devSecret;
}

function signature(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function tokenFor(userId: string) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL;
  const payload = `${userId}.${expires}`;
  return `${payload}.${signature(payload)}`;
}

export function createSessionToken(userId: string) { return tokenFor(userId); }

function verify(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expires, received] = parts;
  if (!userId || Number(expires) < Math.floor(Date.now() / 1000)) return null;
  let expected: string;
  try {
    expected = signature(`${userId}.${expires}`);
  } catch {
    // Kepentingan fail-closed: bila secret tidak tersedia (mis. AUTH_SECRET
    // belum dikonfigurasi di production), setiap sesi dianggap tidak valid.
    return null;
  }
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? userId : null;
}

export const getCurrentUser = cache(async (request?: Request) => {
  const token = request
    ? request.headers.get("cookie")?.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1)
    : (await cookies()).get(SESSION_COOKIE)?.value;
  const userId = token ? verify(token) : null;
  return userId ? findUserById(userId) : null;
});

export async function requireCurrentUser(request?: Request) {
  const user = await getCurrentUser(request);
  if (!user) throw new AuthorizationError("Autentikasi diperlukan.", 401);
  return user;
}

// Untuk halaman autentik (bukan API): bila tidak ada sesi yang valid, alihkan ke
// halaman login ("/") alih-alih menampilkan layar error generik. Skenario umum:
// sesi kedaluwarsa / secret dirotasi sehingga cookie lama ditolak.
export async function requirePageUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user;
}

export class AuthorizationError extends Error {
  constructor(message: string, public status = 403) { super(message); }
}

export function authErrorResponse(error: unknown) {
  const status = error instanceof AuthorizationError ? error.status : 500;
  return Response.json({ success: false, error: { message: error instanceof Error ? error.message : "Akses ditolak.", code: status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN" } }, { status });
}

export async function setSession(userId: string) {
  (await cookies()).set(SESSION_COOKIE, tokenFor(userId), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: SESSION_TTL, path: "/" });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function requireOwnership<T extends { userId: string }>(record: T | null) {
  const user = await requireCurrentUser();
  if (!record || record.userId !== user.id) throw new AuthorizationError("Resource tidak ditemukan.", 404);
  return record;
}
