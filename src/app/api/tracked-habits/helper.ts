import { NextResponse } from "next/server";
import { AuthorizationError, authErrorResponse } from "@/lib/auth";
import { HabitsError } from "@/services/habits";

export function handleTrackedHabitsApiError(error: unknown) {
  if (error instanceof AuthorizationError) {
    return authErrorResponse(error);
  }
  if (error instanceof HabitsError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message,
          code: error.code,
        },
      },
      { status: error.statusCode },
    );
  }
  console.error("TrackedHabits API error:", error);
  return NextResponse.json(
    {
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Terjadi kesalahan internal server.",
        code: "INTERNAL_ERROR",
      },
    },
    { status: 500 },
  );
}
