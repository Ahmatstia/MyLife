import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import type { TriggerCategory } from "@/generated/prisma/client";
import { getBuiltinTriggersLibraryService } from "@/services/habits";
import { handleTrackedHabitsApiError } from "../../helper";

export async function GET(request: Request) {
  try {
    await requireCurrentUser(request);
    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get("category") as TriggerCategory | null;

    const triggers = await getBuiltinTriggersLibraryService(categoryParam || undefined);
    return NextResponse.json({ success: true, data: triggers });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}
