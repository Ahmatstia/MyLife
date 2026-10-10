import { NextResponse } from "next/server";
import { requireCurrentUser, authErrorResponse, AuthorizationError } from "@/lib/auth";
import { addHabitTask, getHabitTasks, HabitServiceError } from "@/services/habit.service";
import { createHabitTaskSchema } from "@/schemas/habit.schema";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = await params;
    const tasks = await getHabitTasks(id, user.id);
    return NextResponse.json({ success: true, data: tasks });
  } catch (error) {
    if (error instanceof AuthorizationError) return authErrorResponse(error);
    console.error("GET /api/habits/[id]/tasks error:", error);
    return NextResponse.json({ success: false, error: "Gagal memuat task kebiasaan." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = await params;
    const body = await request.json();

    const result = createHabitTaskSchema.safeParse(body);
    if (!result.success) {
      const firstIssue = result.error.issues[0]?.message;
      return NextResponse.json({ success: false, error: firstIssue ?? "Data tidak valid." }, { status: 400 });
    }

    const task = await addHabitTask(id, result.data, user.id);
    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) return authErrorResponse(error);
    const isService = error instanceof HabitServiceError;
    console.error("POST /api/habits/[id]/tasks error:", error);
    return NextResponse.json(
      { success: false, error: isService ? error.message : "Gagal menambah task kebiasaan." },
      { status: isService ? 400 : 500 },
    );
  }
}
