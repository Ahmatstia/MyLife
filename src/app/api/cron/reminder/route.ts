import { NextResponse } from "next/server";
import { runGlobalReminderCycle } from "@/services/reminder.service";
import { tickHabitsScheduler } from "@/services/habits/scheduler.service";

// GET /api/cron/reminder
// Cron endpoint untuk menjalankan reminder cycle.
// Dipanggil via PM2 atau OS cron setiap 5 menit: cron expression = "*/5 * * * *"
// Contoh: curl -s -H "x-cron-secret: <CRON_SECRET>" https://yourapp.com/api/cron/reminder
// Dilindungi oleh x-cron-secret header untuk mencegah akses publik.
// Fail-safe: error per-user tidak menginterupsi cron, selalu return JSON.

export async function GET(request: Request) {
  // Security: validate CRON_SECRET header
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    const provided = request.headers.get("x-cron-secret")?.trim();
    if (provided !== cronSecret) {
      return NextResponse.json(
        { success: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }
  }

  try {
    const result = await runGlobalReminderCycle();

    // Integrasi habit scheduler v2 (Langkah 1.5)
    // Dibungkus try/catch agar kegagalan scheduler habit tidak menjatuhkan reminder lama
    let habitsResult = null;
    try {
      habitsResult = await tickHabitsScheduler();
    } catch (habitError) {
      const hMsg = habitError instanceof Error ? habitError.message : "Unknown habit scheduler error";
      console.error("[cron/reminder] Habit scheduler tick error:", hMsg);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        habits: habitsResult,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[cron/reminder] Fatal error:", msg);
    return NextResponse.json(
      { success: false, error: { message: "Reminder cycle failed", code: "INTERNAL_ERROR" } },
      { status: 500 }
    );
  }
}
