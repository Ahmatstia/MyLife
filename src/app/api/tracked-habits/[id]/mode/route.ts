import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { switchHabitModeService } from "@/services/habits";
import { handleTrackedHabitsApiError } from "../../helper";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = await context.params;
    const body = await request.json();

    const habit = await switchHabitModeService(user.id, id, body);
    return NextResponse.json({ success: true, data: habit });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}
