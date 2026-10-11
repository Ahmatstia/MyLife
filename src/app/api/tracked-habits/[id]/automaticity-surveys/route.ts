import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import {
  getAutomaticitySurveysService,
  recordAutomaticitySurveyService,
} from "@/services/habits";
import { handleTrackedHabitsApiError } from "../../helper";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = await context.params;

    const data = await getAutomaticitySurveysService(user.id, id);
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = await context.params;
    const body = await request.json();

    const survey = await recordAutomaticitySurveyService(user.id, id, body);
    return NextResponse.json({ success: true, data: survey }, { status: 201 });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}
