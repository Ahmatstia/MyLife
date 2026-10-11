import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { listPendingCheckinsForUserService } from "@/services/habits";
import { handleTrackedHabitsApiError } from "../helper";

export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser(request);
    const data = await listPendingCheckinsForUserService(user.id);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}
