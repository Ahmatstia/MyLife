import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import type { HabitStatus } from "@/generated/prisma/client";
import {
  createTrackedHabitService,
  listTrackedHabitsService,
} from "@/services/habits";
import { handleTrackedHabitsApiError } from "../tracked-habits/helper";

export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser(request);
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status") as HabitStatus | null;
    const habits = await listTrackedHabitsService(user.id, {
      ...(statusParam ? { status: statusParam } : {}),
    });

    return NextResponse.json({ success: true, data: habits });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser(request);
    const body = await request.json();
    const result = await createTrackedHabitService(user.id, body);

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}

