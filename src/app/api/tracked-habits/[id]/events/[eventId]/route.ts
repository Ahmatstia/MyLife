import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { deleteHabitEventService } from "@/services/habits";
import { handleTrackedHabitsApiError } from "../../../helper";

type Context = { params: Promise<{ id: string; eventId: string }> };

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
