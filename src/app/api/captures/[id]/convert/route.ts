import { NextResponse } from "next/server";
import {
  CaptureServiceError,
  convertToGoal,
  convertToTask,
  convertToProject,
} from "@/services/capture.service";
import { TaskServiceError } from "@/services/task.service";
import { GoalServiceError } from "@/services/goal.service";
import { ProjectServiceError } from "@/services/project.service";
import { requireCurrentUser, authErrorResponse } from "@/lib/auth";
import { ZodError } from "zod";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  let user;
  try {
    user = await requireCurrentUser(request);
  } catch (error) {
    return authErrorResponse(error);
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const target = body.target?.toUpperCase();

    if (target === "TASK") {
      const result = await convertToTask(id, body.data ?? {}, user.id);
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }

    if (target === "GOAL") {
      const result = await convertToGoal(id, body.data ?? {}, user.id);
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }

    if (target === "PROJECT") {
      const result = await convertToProject(id, body.data ?? {}, user.id);
      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }

    return NextResponse.json(
      { success: false, error: { message: "Target konversi harus berupa 'TASK', 'GOAL', atau 'PROJECT'.", code: "INVALID_TARGET" } },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: { message: error.issues[0].message, code: "VALIDATION_ERROR" } },
        { status: 400 }
      );
    }
    if (error instanceof CaptureServiceError) {
      const status = error.code === "CAPTURE_NOT_FOUND" ? 404 : 400;
      return NextResponse.json(
        { success: false, error: { message: error.message, code: error.code } },
        { status }
      );
    }
    if (error instanceof TaskServiceError || error instanceof GoalServiceError || error instanceof ProjectServiceError) {
      return NextResponse.json(
        { success: false, error: { message: error.message, code: error.code } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { message: "Gagal mengonversi catatan.", code: "INTERNAL_ERROR" } },
      { status: 500 }
    );
  }
}
