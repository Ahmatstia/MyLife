import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { getTrackedHabitCalendarService } from "@/services/habits";
import { handleTrackedHabitsApiError } from "../../helper";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (!month) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Query parameter 'month' wajib disertakan (format YYYY-MM)",
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 },
      );
    }

    const data = await getTrackedHabitCalendarService(user.id, id, month);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}
