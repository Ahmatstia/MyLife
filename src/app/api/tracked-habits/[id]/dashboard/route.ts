import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { getTrackedHabitDashboardService } from "@/services/habits";
import { handleTrackedHabitsApiError } from "../../helper";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = await context.params;
    const dashboard = await getTrackedHabitDashboardService(user.id, id);

    return NextResponse.json({ success: true, data: dashboard });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}
