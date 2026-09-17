import { NextResponse } from "next/server";
import { updateChapter, deleteChapter, addFocusArea, deleteFocusArea } from "@/services/direction.service";
import { requireCurrentUser, authErrorResponse, AuthorizationError } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = await params;
    const body = await request.json();

    // Check if adding a focus area
    if (body.action === "add_focus_area") {
      const focus = await addFocusArea(id, body.data, user.id);
      return NextResponse.json({ success: true, data: focus });
    }

    // Check if deleting a focus area
    if (body.action === "delete_focus_area" && body.focusAreaId) {
      await deleteFocusArea(body.focusAreaId, user.id);
      return NextResponse.json({ success: true, message: "Fokus babak berhasil dihapus." });
    }

    const data = await updateChapter(id, body, user.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof AuthorizationError) return authErrorResponse(error);
    return NextResponse.json(
      { success: false, error: { message: (error as Error).message || "Gagal memperbarui babak.", code: "INTERNAL_ERROR" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCurrentUser(request);
    const { id } = await params;

    await deleteChapter(id, user.id);
    return NextResponse.json({ success: true, message: "Babak kehidupan berhasil dihapus." });
  } catch (error) {
    if (error instanceof AuthorizationError) return authErrorResponse(error);
    return NextResponse.json(
      { success: false, error: { message: (error as Error).message || "Gagal menghapus babak.", code: "INTERNAL_ERROR" } },
      { status: 500 }
    );
  }
}
