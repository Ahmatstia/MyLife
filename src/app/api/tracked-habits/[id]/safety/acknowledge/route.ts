import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { acknowledgeSafetyNoticeService } from "@/services/habits";
import { handleTrackedHabitsApiError } from "../../../helper";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = await context.params;
    const result = await acknowledgeSafetyNoticeService(user.id, id);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}
