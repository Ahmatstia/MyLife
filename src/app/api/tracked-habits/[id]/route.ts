import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import {
  getTrackedHabitService,
  updateTrackedHabitService,
} from "@/services/habits";
import { handleTrackedHabitsApiError } from "../helper";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = await context.params;
    const habit = await getTrackedHabitService(user.id, id);

    return NextResponse.json({ success: true, data: habit });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = await context.params;
    const body = await request.json();
    const habit = await updateTrackedHabitService(user.id, id, body);

    return NextResponse.json({ success: true, data: habit });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}
