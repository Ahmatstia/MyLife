import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { logHabitEventService } from "@/services/habits";
import { handleTrackedHabitsApiError } from "../../helper";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = await context.params;
    const idempotencyKey =
      request.headers.get("Idempotency-Key") ||
      request.headers.get("idempotency-key") ||
      undefined;

    const body = await request.json();
    const event = await logHabitEventService(user.id, id, body, idempotencyKey);

    return NextResponse.json({ success: true, data: event }, { status: 201 });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}
