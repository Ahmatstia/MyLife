import { NextResponse } from "next/server";
import { requireCurrentUser, authErrorResponse, AuthorizationError } from "@/lib/auth";
import { editHabitPhase, removeHabitPhase, HabitServiceError } from "@/services/habit.service";
import { updateHabitPhaseSchema } from "@/schemas/habit.schema";

type Params = { params: Promise<{ id: string; phaseId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireCurrentUser(request);
    const { id, phaseId } = await params;
    const body = await request.json();

    const result = updateHabitPhaseSchema.safeParse(body);
    if (!result.success) {
      const firstIssue = result.error.issues[0]?.message;
      return NextResponse.json({ success: false, error: firstIssue ?? "Data tidak valid." }, { status: 400 });
    }

    await editHabitPhase(phaseId, id, result.data, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthorizationError) return authErrorResponse(error);
    const isService = error instanceof HabitServiceError;
    console.error("PATCH /api/habits/[id]/phases/[phaseId] error:", error);
    return NextResponse.json(
      { success: false, error: isService ? error.message : "Gagal mengupdate fase." },
      { status: isService ? 400 : 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await requireCurrentUser(request);
    const { id, phaseId } = await params;
    await removeHabitPhase(phaseId, id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthorizationError) return authErrorResponse(error);
    console.error("DELETE /api/habits/[id]/phases/[phaseId] error:", error);
    return NextResponse.json({ success: false, error: "Gagal menghapus fase." }, { status: 500 });
  }
}
