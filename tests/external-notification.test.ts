import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sendTelegramNotification,
  testTelegramConnection,
} from "../src/services/telegram.service";
import {
  sendEmailNotification,
  testEmailConnection,
} from "../src/services/email.service";
import { dispatchExternalNotification } from "../src/services/external-notification.service";

describe("External Notification Services", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  // ==========================================
  // 1. TELEGRAM NOTIFICATION SERVICE
  // ==========================================
  describe("Telegram Service", () => {
    it("skips gracefully when token or chatId is not configured", async () => {
      delete process.env.TELEGRAM_BOT_TOKEN;
      delete process.env.TELEGRAM_CHAT_ID;

      const result = await sendTelegramNotification({
        title: "Test Alert",
        message: "Test message",
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe("TELEGRAM_NOT_CONFIGURED");
    });

    it("successfully sends message when Telegram API returns ok", async () => {
      process.env.TELEGRAM_BOT_TOKEN = "test-token";
      process.env.TELEGRAM_CHAT_ID = "12345678";

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 999 } }),
      });
      global.fetch = mockFetch as unknown as typeof fetch;

      const result = await sendTelegramNotification({
        title: "Due Task",
        message: "Your task is due today",
        severity: "WARNING",
        linkUrl: "/tasks/123",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe(999);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("formats HTML with clickable link using APP_URL and linkLabel", async () => {
      process.env.TELEGRAM_BOT_TOKEN = "test-token";
      process.env.TELEGRAM_CHAT_ID = "12345678";
      process.env.APP_URL = "https://myprogres.vercel.app";

      let sentBody = "";
      const mockFetch = vi.fn().mockImplementation(async (_url, options) => {
        sentBody = options.body;
        return {
          ok: true,
          json: async () => ({ ok: true, result: { message_id: 1001 } }),
        };
      });
      global.fetch = mockFetch as unknown as typeof fetch;

      const result = await sendTelegramNotification({
        title: "Tenggat Terlewat: Bikin Laporan",
        message: "Task sudah jatuh tempo",
        severity: "WARNING",
        linkUrl: "/tasks/abc-123",
        linkLabel: "Buka Task: Bikin Laporan →",
      });

      expect(result.success).toBe(true);
      const parsed = JSON.parse(sentBody);
      expect(parsed.parse_mode).toBe("HTML");
      expect(parsed.text).toContain('<a href="https://myprogres.vercel.app/tasks/abc-123">🔗 Buka Task: Bikin Laporan →</a>');
      expect(parsed.text).toContain("⚠️ <b>Tenggat Terlewat: Bikin Laporan</b>");
    });

    it("handles Telegram API errors gracefully without throwing", async () => {
      process.env.TELEGRAM_BOT_TOKEN = "test-token";
      process.env.TELEGRAM_CHAT_ID = "12345678";

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ ok: false, description: "Bad Request: chat not found" }),
      });
      global.fetch = mockFetch as unknown as typeof fetch;

      const result = await testTelegramConnection();

      expect(result.success).toBe(false);
      expect(result.reason).toContain("chat not found");
    });
  });

  // ==========================================
  // 2. EMAIL NOTIFICATION SERVICE
  // ==========================================
  describe("Email Service", () => {
    it("skips gracefully when recipient or credentials are missing", async () => {
      delete process.env.EMAIL_USER;
      delete process.env.EMAIL_PASS;
      delete process.env.NOTIFICATION_EMAIL_TO;

      const result = await sendEmailNotification({
        subject: "Test Subject",
        text: "Test content",
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe("RECIPIENT_NOT_CONFIGURED");
    });

    it("returns EMAIL_NOT_CONFIGURED when recipient is provided but credentials missing", async () => {
      delete process.env.EMAIL_USER;
      delete process.env.EMAIL_PASS;

      const result = await sendEmailNotification({
        to: "user@example.com",
        subject: "Test Subject",
        text: "Test content",
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe("EMAIL_NOT_CONFIGURED");
    });

    it("skips testEmailConnection gracefully when credentials missing", async () => {
      delete process.env.EMAIL_USER;
      delete process.env.EMAIL_PASS;

      const result = await testEmailConnection("user@example.com");
      expect(result.success).toBe(false);
      expect(result.reason).toBe("EMAIL_NOT_CONFIGURED");
    });
  });

  // ==========================================
  // 3. EXTERNAL DISPATCHER
  // ==========================================
  describe("dispatchExternalNotification", () => {
    it("dispatches only to Telegram for INFO severity", async () => {
      delete process.env.TELEGRAM_BOT_TOKEN;
      delete process.env.EMAIL_USER;

      const result = await dispatchExternalNotification({
        title: "Info notification",
        message: "Just an update",
        severity: "INFO",
      });

      expect(result.telegram.attempted).toBe(true);
      expect(result.email.attempted).toBe(false);
    });

    it("dispatches to both Telegram and Email for WARNING and CRITICAL severity", async () => {
      delete process.env.TELEGRAM_BOT_TOKEN;
      delete process.env.EMAIL_USER;

      const result = await dispatchExternalNotification({
        title: "Critical warning",
        message: "Urgent deadline missed",
        severity: "CRITICAL",
      });

      expect(result.telegram.attempted).toBe(true);
      expect(result.email.attempted).toBe(true);
    });
  });
});
