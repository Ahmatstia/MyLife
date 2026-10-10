import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { celebrateMilestoneService } from "@/services/habits";
import { handleTrackedHabitsApiError } from "../../../../helper";

type Context = { params: Promise<{ id: string; milestoneId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireCurrentUser(request);
    const { id, milestoneId } = await context.params;
    const result = await celebrateMilestoneService(user.id, id, milestoneId);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}
