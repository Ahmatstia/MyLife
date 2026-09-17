import { NextResponse } from "next/server";
import { getVision, upsertVision } from "@/services/direction.service";
import { requireCurrentUser, authErrorResponse, AuthorizationError } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser(request);
    const data = await getVision(user.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof AuthorizationError) return authErrorResponse(error);
    return NextResponse.json(
      { success: false, error: { message: "Gagal memuat visi hidup.", code: "INTERNAL_ERROR" } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser(request);
    const body = await request.json();

    if (!body.statement || typeof body.statement !== "string" || !body.statement.trim()) {
      return NextResponse.json(
        { success: false, error: { message: "Pernyataan visi (North Star) tidak boleh kosong.", code: "INVALID_INPUT" } },
        { status: 400 }
      );
    }

    const data = await upsertVision(body, user.id);
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    if (error instanceof AuthorizationError) return authErrorResponse(error);
    return NextResponse.json(
      { success: false, error: { message: "Gagal menyimpan visi hidup.", code: "INTERNAL_ERROR" } },
      { status: 500 }
    );
  }
}
