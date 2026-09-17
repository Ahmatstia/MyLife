import { NextResponse } from "next/server";
import { getCompassSummary } from "@/services/direction.service";
import { requireCurrentUser, authErrorResponse, AuthorizationError } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser(request);
    const data = await getCompassSummary(user.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof AuthorizationError) return authErrorResponse(error);
    return NextResponse.json(
      { success: false, error: { message: "Gagal memuat ringkasan arah.", code: "INTERNAL_ERROR" } },
      { status: 500 }
    );
  }
}
