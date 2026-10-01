import { NextResponse } from "next/server";
import { requireCurrentUser, authErrorResponse, AuthorizationError } from "@/lib/auth";
import { createHabit, getHabits, addHabitPhase, HabitServiceError } from "@/services/habit.service";
import { createHabitSchema, createHabitPhaseSchema } from "@/schemas/habit.schema";

export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser(request);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as string | null;
    const isActiveStr = searchParams.get("isActive");
    const isActive = isActiveStr === null ? undefined : isActiveStr === "true";

    const habits = await getHabits(user.id, {
      ...(type && { type }),
      ...(isActive !== undefined && { isActive }),
    });

    return NextResponse.json({ success: true, data: habits });
  } catch (error) {
    if (error instanceof AuthorizationError) return authErrorResponse(error);
    console.error("GET /api/habits error:", error);
    return NextResponse.json({ success: false, error: "Gagal memuat kebiasaan." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser(request);
    const body = await request.json();

    // Extract private _defaultPhases field before validation
    const { _defaultPhases, ...habitBody } = body;

    const result = createHabitSchema.safeParse(habitBody);
    if (!result.success) {
      const firstIssue = result.error.issues[0]?.message;
      return NextResponse.json(
        { success: false, error: firstIssue ?? "Data tidak valid." },
        { status: 400 },
      );
    }

    const habit = await createHabit(result.data, user.id);

    // Auto-create graduated phases if provided (for BAD habits)
    if (_defaultPhases && Array.isArray(_defaultPhases) && habit.type === "BAD") {
      for (const phaseData of _defaultPhases) {
        const phaseResult = createHabitPhaseSchema.safeParse(phaseData);
        if (phaseResult.success) {
          await addHabitPhase(habit.id, phaseResult.data, user.id);
        }
      }
    }

    return NextResponse.json({ success: true, data: habit }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) return authErrorResponse(error);
    const isService = error instanceof HabitServiceError;
    console.error("POST /api/habits error:", error);
    return NextResponse.json(
      { success: false, error: isService ? error.message : "Gagal membuat kebiasaan." },
      { status: isService ? 400 : 500 },
    );
  }
}
