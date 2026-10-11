import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import {
  toggleHabitReminderService,
  deleteHabitReminderService,
} from "@/services/habits";
import { handleTrackedHabitsApiError } from "../../../helper";

type Context = { params: Promise<{ id: string; reminderId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireCurrentUser(request);
    const { id, reminderId } = await context.params;
    const body = await request.json();
    const updated = await toggleHabitReminderService(
      user.id,
      id,
      reminderId,
      Boolean(body.isActive)
    );
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const user = await requireCurrentUser(request);
    const { id, reminderId } = await context.params;
    const result = await deleteHabitReminderService(user.id, id, reminderId);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}
