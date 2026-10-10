import { NextResponse } from "next/server";
import { requireCurrentUser, authErrorResponse, AuthorizationError } from "@/lib/auth";
import { editHabitTask, removeHabitTask, HabitServiceError } from "@/services/habit.service";
import { updateHabitTaskSchema } from "@/schemas/habit.schema";

type Params = { params: Promise<{ id: string; taskId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireCurrentUser(request);
    const { id, taskId } = await params;
    const body = await request.json();

    const result = updateHabitTaskSchema.safeParse(body);
    if (!result.success) {
      const firstIssue = result.error.issues[0]?.message;
      return NextResponse.json({ success: false, error: firstIssue ?? "Data tidak valid." }, { status: 400 });
    }

    await editHabitTask(id, taskId, result.data, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthorizationError) return authErrorResponse(error);
    const isService = error instanceof HabitServiceError;
    console.error("PATCH /api/habits/[id]/tasks/[taskId] error:", error);
    return NextResponse.json(
      { success: false, error: isService ? error.message : "Gagal mengupdate task kebiasaan." },
      { status: isService ? 400 : 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await requireCurrentUser(request);
    const { id, taskId } = await params;

    await removeHabitTask(id, taskId, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthorizationError) return authErrorResponse(error);
    const isService = error instanceof HabitServiceError;
    console.error("DELETE /api/habits/[id]/tasks/[taskId] error:", error);
    return NextResponse.json(
      { success: false, error: isService ? error.message : "Gagal menghapus task kebiasaan." },
      { status: isService ? 400 : 500 },
    );
  }
}
