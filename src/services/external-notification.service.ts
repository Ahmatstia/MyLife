import { sendTelegramNotification } from "./telegram.service";
import { sendEmailNotification } from "./email.service";
import { logger } from "@/lib/logger";

export interface DispatchExternalNotificationInput {
  title: string;
  message: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  type?: string;
  linkUrl?: string;
  linkLabel?: string;
}

export interface DispatchResult {
  telegram: { attempted: boolean; success: boolean; reason?: string };
  email: { attempted: boolean; success: boolean; reason?: string };
}

/**
 * Dispatcher terpadu untuk menyalurkan notifikasi ke kanal eksternal (Telegram & Email).
 * - Seluruh notifikasi dikirim ke Telegram jika bot terkonfigurasi.
 * - Notifikasi dengan severity WARNING atau CRITICAL juga dikirim ke Email jika SMTP terkonfigurasi.
 */
export async function dispatchExternalNotification(
  input: DispatchExternalNotificationInput
): Promise<DispatchResult> {
  const result: DispatchResult = {
    telegram: { attempted: false, success: false },
    email: { attempted: false, success: false },
  };

  // 1. Dispatch ke Telegram
  try {
    result.telegram.attempted = true;
    const tgRes = await sendTelegramNotification({
      title: input.title,
      message: input.message,
      severity: input.severity,
      linkUrl: input.linkUrl,
      linkLabel: input.linkLabel,
    });
    result.telegram.success = tgRes.success;
    result.telegram.reason = tgRes.reason;
  } catch (err) {
    logger.warn("Telegram dispatch unexpected error", { err });
  }

  // 2. Dispatch ke Email untuk notifikasi berbobot tinggi (WARNING & CRITICAL)
  if (input.severity === "WARNING" || input.severity === "CRITICAL") {
    try {
      result.email.attempted = true;
      const emailRes = await sendEmailNotification({
        subject: `[${input.severity}] ${input.title}`,
        text: `${input.message}${input.linkUrl ? `\n\nAkses: ${input.linkUrl}` : ""}`,
        severity: input.severity,
      });
      result.email.success = emailRes.success;
      result.email.reason = emailRes.reason;
    } catch (err) {
      logger.warn("Email dispatch unexpected error", { err });
    }
  }

  return result;
}
