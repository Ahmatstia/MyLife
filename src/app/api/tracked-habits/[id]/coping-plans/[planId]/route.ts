import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import {
  updateCopingPlanService,
  deleteCopingPlanService,
} from "@/services/habits";
import { handleTrackedHabitsApiError } from "../../../helper";

type Context = { params: Promise<{ id: string; planId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireCurrentUser(request);
    const { id, planId } = await context.params;
    const body = await request.json();
    const updated = await updateCopingPlanService(user.id, id, planId, body);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const user = await requireCurrentUser(request);
    const { id, planId } = await context.params;
    const deleted = await deleteCopingPlanService(user.id, id, planId);

    return NextResponse.json({ success: true, data: deleted });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}
