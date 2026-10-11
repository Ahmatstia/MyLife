import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { getHabitInsightsService } from "@/services/habits";
import { handleTrackedHabitsApiError } from "../../helper";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = await context.params;

    const url = new URL(request.url);
    const rangeParam = url.searchParams.get("range");
    let rangeDays: 30 | 60 | 90 = 60;
    if (rangeParam === "30d" || rangeParam === "30") rangeDays = 30;
    if (rangeParam === "90d" || rangeParam === "90") rangeDays = 90;

    const result = await getHabitInsightsService(user.id, id, rangeDays);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}
