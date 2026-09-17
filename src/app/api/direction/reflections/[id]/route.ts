import { NextResponse } from "next/server";
import { deleteReflection } from "@/services/direction.service";
import { requireCurrentUser, authErrorResponse, AuthorizationError } from "@/lib/auth";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = await params;

    await deleteReflection(id, user.id);
    return NextResponse.json({ success: true, message: "Refleksi berhasil dihapus." });
  } catch (error) {
    if (error instanceof AuthorizationError) return authErrorResponse(error);
    return NextResponse.json(
      { success: false, error: { message: (error as Error).message || "Gagal menghapus refleksi.", code: "INTERNAL_ERROR" } },
      { status: 500 }
    );
  }
}
