import { NextResponse } from "next/server";
import { getAllChapters, createChapter } from "@/services/direction.service";
import { requireCurrentUser, authErrorResponse, AuthorizationError } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser(request);
    const data = await getAllChapters(user.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof AuthorizationError) return authErrorResponse(error);
    return NextResponse.json(
      { success: false, error: { message: "Gagal memuat daftar babak kehidupan.", code: "INTERNAL_ERROR" } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser(request);
    const body = await request.json();

    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { success: false, error: { message: "Judul babak kehidupan wajib diisi.", code: "INVALID_INPUT" } },
        { status: 400 }
      );
    }

    const data = await createChapter(body, user.id);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) return authErrorResponse(error);
    return NextResponse.json(
      { success: false, error: { message: "Gagal membuat babak kehidupan baru.", code: "INTERNAL_ERROR" } },
      { status: 500 }
    );
  }
}
