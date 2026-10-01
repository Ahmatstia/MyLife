import { NextResponse } from "next/server";
import { requireCurrentUser, authErrorResponse, AuthorizationError } from "@/lib/auth";
import { checkInHabit, HabitServiceError } from "@/services/habit.service";
import { createHabitLogSchema } from "@/schemas/habit.schema";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = await params;
    const body = await request.json();

    const result = createHabitLogSchema.safeParse(body);
    if (!result.success) {
      const firstIssue = result.error.issues[0]?.message;
      return NextResponse.json({ success: false, error: firstIssue ?? "Data tidak valid." }, { status: 400 });
    }

    const checkInResult = await checkInHabit(id, result.data, user.id);
    return NextResponse.json({ success: true, data: checkInResult }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) return authErrorResponse(error);
    const isService = error instanceof HabitServiceError;
    console.error("POST /api/habits/[id]/log error:", error);
    return NextResponse.json(
      { success: false, error: isService ? error.message : "Gagal menyimpan check-in." },
      { status: isService ? 400 : 500 },
    );
  }
}
