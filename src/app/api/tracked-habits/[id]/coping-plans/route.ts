import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import {
  getCopingPlansService,
  createCopingPlanService,
} from "@/services/habits";
import { handleTrackedHabitsApiError } from "../../helper";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = await context.params;
    const plans = await getCopingPlansService(user.id, id);

    return NextResponse.json({ success: true, data: plans });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = await context.params;
    const body = await request.json();
    const plan = await createCopingPlanService(user.id, id, body);

    return NextResponse.json({ success: true, data: plan }, { status: 201 });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}
