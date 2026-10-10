import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import {
  getWeeklyReflectionPromptService,
  submitWeeklyReflectionService,
  getReengagementStatusService,
} from "@/services/habits";
import { handleTrackedHabitsApiError } from "../../helper";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = await context.params;
    const [reflectionData, reengagement] = await Promise.all([
      getWeeklyReflectionPromptService(user.id, id),
      getReengagementStatusService(user.id, id),
    ]);
    return NextResponse.json({
      success: true,
      data: { ...reflectionData, reengagement },
    });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = await context.params;
    const body = await request.json();
    const updated = await submitWeeklyReflectionService(
      user.id,
      id,
      body.reflectionId,
      body.answer
    );
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}
