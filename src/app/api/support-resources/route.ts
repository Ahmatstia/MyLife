import { NextResponse } from "next/server";
import { getSupportResourcesService } from "@/services/habits";
import { handleTrackedHabitsApiError } from "../tracked-habits/helper";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country") ?? undefined;
    const category = searchParams.get("category") ?? undefined;

    const resources = await getSupportResourcesService({
      country: country || undefined,
      category: category || undefined,
    });

    return NextResponse.json({ success: true, data: resources });
  } catch (error) {
    return handleTrackedHabitsApiError(error);
  }
}
