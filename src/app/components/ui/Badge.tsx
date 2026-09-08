import type { IconName } from "./Icon";
import { Icon } from "./Icon";

export type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "info" | "ai";

const tones: Record<Tone, string> = {
  neutral: "bg-white/[0.06] text-[#94a3b8] border-white/[0.1]",
  primary: "bg-[#8B5CF6]/15 text-[#d0bcff] border-[#8B5CF6]/30",
  success: "bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/30",
  warning: "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30",
  danger: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  info: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  ai: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
};

export function Badge({
  tone = "neutral",
  icon,
  children,
  dot = false,
  className = "",
}: {
  tone?: Tone;
  icon?: IconName;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {icon && <Icon name={icon} size={13} />}
      {dot && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-current"
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

/* Status badge — maps raw status strings to a tone + readable label */
const statusMap: Record<string, { tone: Tone; label: string }> = {
  ACTIVE: { tone: "primary", label: "Aktif" },
  PAUSED: { tone: "warning", label: "Dijeda" },
  COMPLETED: { tone: "success", label: "Selesai" },
  NOT_STARTED: { tone: "neutral", label: "Belum dimulai" },
  IN_PROGRESS: { tone: "primary", label: "Sedang dikerjakan" },
};

export function StatusBadge({ status }: { status: string }) {
  const mapped = statusMap[status] ?? {
    tone: "neutral" as Tone,
    label: status.replace(/_/g, " "),
  };
  return <Badge tone={mapped.tone} dot>{mapped.label}</Badge>;
}

const priorityMap: Record<string, { tone: Tone; label: string }> = {
  HIGH: { tone: "danger", label: "Tinggi" },
  MEDIUM: { tone: "warning", label: "Sedang" },
  LOW: { tone: "neutral", label: "Rendah" },
};

export function PriorityBadge({ priority }: { priority: string }) {
  const { tone, label } = priorityMap[priority] ?? { tone: "neutral" as Tone, label: priority };
  return <Badge tone={tone}>{label}</Badge>;
}
