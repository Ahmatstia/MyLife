import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { resetHabitPlanService } from "@/services/habits";
import { handleTrackedHabitsApiError } from "../../../helper";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = await context.params;
    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const result = await resetHabitPlanService(user.id, id, body);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}
