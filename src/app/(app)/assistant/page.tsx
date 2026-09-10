import { AssistantChat } from "@/app/components/assistant/AssistantChat";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Life Copilot AI | MyLife",
  description: "Asisten AI personal kamu — tanya goals, tasks, progress, dan rencanakan hidupmu.",
};

export default async function AssistantPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <div className="flex h-[calc(100vh-3.5rem-5rem)] flex-col lg:h-[calc(100vh-3.5rem-2.5rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/[0.07] pb-4 mb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] shadow-[0_0_20px_rgba(139,92,246,0.3)]">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white"
          >
            <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
            <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
          </svg>
        </div>
        <div>
          <h1 className="text-[15px] font-bold text-white leading-tight">Life Copilot AI</h1>
          <p className="text-[12px] text-[#64748b]">
            Asisten personal MyLife — tanya apa saja, buat goals, pantau progress
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </span>
        </div>
      </div>

      {/* Chat interface */}
      <AssistantChat currentPage="assistant" />
    </div>
  );
}
