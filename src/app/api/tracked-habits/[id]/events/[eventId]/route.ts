import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import {
  deleteHabitEventService,
  updateHabitEventService,
} from "@/services/habits";
import { handleTrackedHabitsApiError } from "../../../helper";

type Context = { params: Promise<{ id: string; eventId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireCurrentUser(request);
    const { id, eventId } = await context.params;
    const body = await request.json();
    const result = await updateHabitEventService(user.id, id, eventId, body);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const user = await requireCurrentUser(request);
    const { id, eventId } = await context.params;
    const result = await deleteHabitEventService(user.id, id, eventId);

    return NextResponse.json(result);
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}
