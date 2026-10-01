import { NextResponse } from "next/server";
import { requireCurrentUser, authErrorResponse, AuthorizationError } from "@/lib/auth";
import { getHabit, updateHabit, deleteHabit, getHabitStats, HabitServiceError } from "@/services/habit.service";
import { updateHabitSchema } from "@/schemas/habit.schema";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    if (searchParams.get("stats") === "true") {
      const stats = await getHabitStats(id, user.id);
      return NextResponse.json({ success: true, data: stats });
    }

    const habit = await getHabit(id, user.id);
    return NextResponse.json({ success: true, data: habit });
  } catch (error) {
    if (error instanceof AuthorizationError) return authErrorResponse(error);
    const isService = error instanceof HabitServiceError;
    console.error("GET /api/habits/[id] error:", error);
    return NextResponse.json(
      { success: false, error: isService ? error.message : "Gagal memuat kebiasaan." },
      { status: isService && error.code === "HABIT_NOT_FOUND" ? 404 : 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = await params;
    const body = await request.json();

    const result = updateHabitSchema.safeParse(body);
    if (!result.success) {
      const firstIssue = result.error.issues[0]?.message;
      return NextResponse.json({ success: false, error: firstIssue ?? "Data tidak valid." }, { status: 400 });
    }

    await updateHabit(id, result.data, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthorizationError) return authErrorResponse(error);
    const isService = error instanceof HabitServiceError;
    console.error("PATCH /api/habits/[id] error:", error);
    return NextResponse.json(
      { success: false, error: isService ? error.message : "Gagal mengupdate kebiasaan." },
      { status: isService ? 400 : 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = await params;
    await deleteHabit(id, user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthorizationError) return authErrorResponse(error);
    const isService = error instanceof HabitServiceError;
    console.error("DELETE /api/habits/[id] error:", error);
    return NextResponse.json(
      { success: false, error: isService ? error.message : "Gagal menghapus kebiasaan." },
      { status: isService ? 400 : 500 },
    );
  }
}
