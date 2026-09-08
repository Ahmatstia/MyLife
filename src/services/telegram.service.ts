import { logger } from "@/lib/logger";

export interface TelegramNotificationPayload {
  title: string;
  message: string;
  severity?: "INFO" | "WARNING" | "CRITICAL" | "URGENT";
  linkUrl?: string;
  linkLabel?: string;
  chatId?: string;
}

export interface TelegramSendResult {
  success: boolean;
  messageId?: number;
  reason?: string;
}

const SEVERITY_EMOJIS: Record<string, string> = {
  INFO: "ℹ️",
  WARNING: "⚠️",
  CRITICAL: "🚨",
  URGENT: "🔴",
};

const SEVERITY_LABELS: Record<string, string> = {
  INFO: "Info",
  WARNING: "Perhatian",
  CRITICAL: "Kritis",
  URGENT: "Segera",
};

/**
 * Resolve a relative path to an absolute URL using APP_URL env variable.
 */
function toAbsoluteUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

/**
 * Kirim pesan notifikasi melalui Telegram Bot API.
 * Menggunakan standard fetch bawaan Node 18+ tanpa dependensi luar.
 * Tidak pernah melempar error (fail-safe) agar tidak memblokir workflow aplikasi.
 *
 * Format pesan (HTML Telegram):
 *   ⚠️ <b>Judul Notifikasi</b>
 *   <i>[ Perhatian ]</i>
 *
 *   Isi pesan yang menjelaskan konteks.
 *
 *   🔗 <a href="https://app.com/tasks/abc123">Buka Task →</a>
 *
 *   <i>— MyLife Personal OS</i>
 */
export async function sendTelegramNotification(
  payload: TelegramNotificationPayload
): Promise<TelegramSendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const targetChatId = (payload.chatId || process.env.TELEGRAM_CHAT_ID)?.trim();

  if (!token || !targetChatId) {
    logger.debug("Telegram notification skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not configured");
    return {
      success: false,
      reason: "TELEGRAM_NOT_CONFIGURED",
    };
  }

  const severity = payload.severity || "INFO";
  const emoji = SEVERITY_EMOJIS[severity] || "🔔";
  const severityLabel = SEVERITY_LABELS[severity] || "Info";

  // Format HTML aman untuk Telegram
  const escapeHtml = (str: string) =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Build absolute URL jika ada link
  const absoluteUrl = toAbsoluteUrl(payload.linkUrl);
  const linkLabel = payload.linkLabel || "Buka Sekarang →";

  // Baris header: emoji + judul bold
  let text = `${emoji} <b>${escapeHtml(payload.title)}</b>`;

  // Badge severity
  text += `\n<i>[ ${severityLabel} ]</i>`;

  // Body pesan
  text += `\n\n${escapeHtml(payload.message)}`;

  // Link klikable jika tersedia
  if (absoluteUrl) {
    text += `\n\n<a href="${absoluteUrl}">🔗 ${escapeHtml(linkLabel)}</a>`;
  }

  // Footer
  text += `\n\n<i>— MyLife Personal OS</i>`;

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: targetChatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    const body = (await res.json()) as { ok: boolean; result?: { message_id: number }; description?: string };

    if (!res.ok || !body.ok) {
      const reason = body.description || `HTTP ${res.status}`;
      logger.warn("Failed to send Telegram notification", { reason });
      return { success: false, reason };
    }

    return {
      success: true,
      messageId: body.result?.message_id,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown fetch error";
    logger.warn("Exception while sending Telegram notification", { error: reason });
    return {
      success: false,
      reason,
    };
  }
}

/**
 * Uji koneksi bot Telegram dengan mengirimkan pesan tes.
 */
export async function testTelegramConnection(chatId?: string): Promise<TelegramSendResult> {
  return sendTelegramNotification({
    title: "MyLife — Notifikasi Aktif ✓",
    message: "Halo! Bot Telegram berhasil terhubung dengan sistem MyLife Anda. Pengingat deadline, acara kalender, dan update penting akan dikirim melalui chat ini.",
    severity: "INFO",
    linkUrl: "/today",
    linkLabel: "Buka MyLife Dashboard →",
    chatId,
  });
}
