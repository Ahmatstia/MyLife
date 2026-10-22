import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import {
  updateHabitTriggerService,
  removeHabitTriggerService,
} from "@/services/habits";
import { handleTrackedHabitsApiError } from "../../../helper";

type Context = { params: Promise<{ id: string; habitTriggerId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireCurrentUser(request);
    const { id, habitTriggerId } = await context.params;
    const body = await request.json();
    const updated = await updateHabitTriggerService(user.id, id, habitTriggerId, body);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const user = await requireCurrentUser(request);
    const { id, habitTriggerId } = await context.params;
    const deleted = await removeHabitTriggerService(user.id, id, habitTriggerId);

    return NextResponse.json({ success: true, data: deleted });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}
