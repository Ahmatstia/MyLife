import { NextResponse } from "next/server";
import { z } from "zod";
import { processChat, executeConfirmedChatCommand } from "@/services/ai-chat.service";
import { requireCurrentUser, authErrorResponse } from "@/lib/auth";

const chatInputSchema = z.object({
  text: z.string().trim().min(1).max(4000),
  confirmed: z.boolean().default(false),
  confirmationToken: z.string().trim().min(1).max(512).optional(),
  context: z
    .object({
      goalId: z.string().trim().min(1).optional(),
      taskId: z.string().trim().min(1).optional(),
      stageId: z.string().trim().min(1).optional(),
      goalName: z.string().trim().min(1).max(200).optional(),
      taskName: z.string().trim().min(1).max(200).optional(),
    })
    .optional(),
  currentPage: z.string().trim().max(100).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(10000),
      })
    )
    .max(15)
    .optional(),
});

export async function POST(request: Request) {
  let user;
  try {
    user = await requireCurrentUser(request);
  } catch (error) {
    return authErrorResponse(error);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = chatInputSchema.safeParse(body);
  if (!parsed.success) {
    console.warn("[POST /api/ai/chat] Invalid payload issues:", parsed.error.issues);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INVALID_INPUT", message: "Input chat tidak valid." },
        details: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  try {
    const { text, confirmed, confirmationToken, context, currentPage, history } = parsed.data;

    // If this is a confirmed execution, route to existing confirmation mechanism
    if (confirmed && confirmationToken) {
      const result = await executeConfirmedChatCommand(text, confirmationToken, context, user.id);
      return NextResponse.json({ success: result.success, message: result.message, commandResult: result }, {
        status: result.success ? 200 : 409,
      });
    }

    // Normal chat processing
    const result = await processChat(text, user.id, context, currentPage, history);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("POST /api/ai/chat:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Chat AI gagal diproses." } },
      { status: 500 }
    );
  }
}
