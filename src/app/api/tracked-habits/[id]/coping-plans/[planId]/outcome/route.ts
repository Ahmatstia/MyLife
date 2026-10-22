import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { recordCopingPlanOutcomeService } from "@/services/habits";
import { handleTrackedHabitsApiError } from "../../../../helper";

type Context = { params: Promise<{ id: string; planId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireCurrentUser(request);
    const { id, planId } = await context.params;
    const body = await request.json();
    const result = await recordCopingPlanOutcomeService(user.id, id, planId, body);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}
