"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/app/components/ui/Toast";
import { Icon } from "@/app/components/ui/Icon";
import { CelebrationEffect } from "./CelebrationEffect";

type Status = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

const stages: {
  key: Status;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  activeClass: string;
  dotClass: string;
  description: string;
}[] = [
  {
    key: "NOT_STARTED",
    label: "Belum dimulai",
    shortLabel: "Belum",
    icon: <Icon name="circle" size={14} />,
    activeClass:
      "bg-white/[0.08] border-white/[0.2] text-white shadow-sm",
    dotClass: "bg-gray-400",
    description: "Task belum dikerjakan",
  },
  {
    key: "IN_PROGRESS",
    label: "Sedang dikerjakan",
    shortLabel: "Sedang",
    icon: <Icon name="play" size={14} />,
    activeClass:
      "bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border-purple-400/50 text-purple-200 shadow-[0_0_14px_rgba(168,85,247,0.3)]",
    dotClass: "bg-purple-400 animate-pulse",
    description: "Task sedang berjalan",
  },
  {
    key: "COMPLETED",
    label: "Selesai",
    shortLabel: "Selesai",
    icon: <Icon name="check" size={14} strokeWidth={2.5} />,
    activeClass:
      "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-emerald-400/50 text-emerald-200 shadow-[0_0_14px_rgba(52,211,153,0.3)]",
    dotClass: "bg-emerald-400",
    description: "Task selesai dikerjakan",
  },
];

export function TaskStatusPicker({
  taskId,
  status,
}: {
  taskId: string;
  status: Status;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [current, setCurrent] = useState<Status>(status);
  const [loading, setLoading] = useState<Status | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const completeBtnRef = useRef<HTMLButtonElement>(null);
  const originRef = useRef<HTMLElement | null>(null);

  async function select(next: Status) {
    if (next === current || loading) return;
    setLoading(next);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: next,
          ...(next === "COMPLETED" ? {} : {}),
        }),
      });
      if (!res.ok) throw new Error();
      setCurrent(next);
      if (next === "COMPLETED") {
        originRef.current = completeBtnRef.current;
        setCelebrate(true);
        // reset so it can re-trigger if needed
        setTimeout(() => setCelebrate(false), 100);
      }
      const labels: Record<Status, string> = {
        NOT_STARTED: "Task dikembalikan ke awal.",
        IN_PROGRESS: "Task dimulai. Semangat! 💪",
        COMPLETED: "Task selesai! Luar biasa! 🎉",
      };
      toast(labels[next], next === "COMPLETED" ? "success" : "info");
      router.refresh();
    } catch {
      toast("Gagal memperbarui status.", "error");
    } finally {
      setLoading(null);
    }
  }

  const currentStage = stages.find((s) => s.key === current) ?? stages[0];

  return (
    <>
      <CelebrationEffect trigger={celebrate} originEl={originRef} />
      <div className="space-y-2.5">
        {/* Active status indicator */}
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${currentStage.dotClass}`} />
          <span className="text-[12px] font-mono text-[#94a3b8]">
            Status saat ini:{" "}
            <span className="text-white font-bold">{currentStage.label}</span>
          </span>
        </div>

        {/* Segmented picker */}
        <div
          role="group"
          aria-label="Pilih status task"
          className="flex gap-1.5 rounded-2xl border border-white/[0.08] bg-[#0B0D13] p-1.5 shadow-inner"
        >
          {stages.map((stage, idx) => {
            const isActive = stage.key === current;
            const isLoading = loading === stage.key;
            // Connector line
            const showConnector = idx < stages.length - 1;
            const leftDone =
              stages.findIndex((s) => s.key === current) > idx;

            return (
              <div key={stage.key} className="flex flex-1 items-center">
                <button
                  type="button"
                  onClick={() => select(stage.key)}
                  disabled={!!loading}
                  aria-pressed={isActive}
                  aria-label={stage.label}
                  title={stage.description}
                  className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-[12px] font-semibold transition-all duration-200 disabled:cursor-not-allowed cursor-pointer ${
                    isActive
                      ? `${stage.activeClass} status-ripple`
                      : "border-transparent text-[#94a3b8] hover:bg-white/[0.06] hover:text-white"
                  }`}
                  {...(stage.key === "COMPLETED" ? { ref: completeBtnRef } : {})}
                >
                  {isLoading ? (
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    stage.icon
                  )}
                  <span className="hidden sm:inline">{stage.shortLabel}</span>
                  <span className="sm:hidden">{stage.icon}</span>
                </button>

                {showConnector && (
                  <div
                    aria-hidden="true"
                    className={`mx-1 h-px flex-shrink-0 w-4 transition-colors duration-300 ${
                      leftDone ? "bg-emerald-500/50" : "bg-white/[0.08]"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Progress steps label row */}
        <div className="flex items-center justify-between px-2">
          {stages.map((stage) => (
            <span
              key={stage.key}
              className={`text-[10px] font-mono transition-colors ${
                stage.key === current
                  ? "text-[#d0bcff] font-semibold"
                  : "text-[#64748b]"
              }`}
            >
              {stage.label}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
