import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import {
  listHabitRemindersService,
  createHabitReminderService,
} from "@/services/habits";
import { handleTrackedHabitsApiError } from "../../helper";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = await context.params;
    const result = await listHabitRemindersService(user.id, id);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = await context.params;
    const body = await request.json();
    const reminder = await createHabitReminderService(user.id, id, body);
    return NextResponse.json({ success: true, data: reminder });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}
