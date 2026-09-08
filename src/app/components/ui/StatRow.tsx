import type { ReactNode } from "react";
import type { IconName } from "./Icon";
import { Icon } from "./Icon";

export function StatList({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <dl className={`${className}`}>{children}</dl>;
}

const iconConfig: Record<
  string,
  { bg: string; text: string }
> = {
  neutral: { bg: "bg-white/[0.05]", text: "text-gray-400" },
  primary: { bg: "bg-[#c0c1ff]/15", text: "text-[#c0c1ff]" },
  success: { bg: "bg-[#4edea3]/15", text: "text-[#4edea3]" },
  warning: { bg: "bg-[#F59E0B]/15", text: "text-[#F59E0B]" },
  ai: { bg: "bg-[#a078ff]/15", text: "text-[#d0bcff]" },
};

export function StatRow({
  icon,
  tone = "neutral",
  label,
  value,
  hint,
  className = "",
}: {
  icon: IconName;
  tone?: keyof typeof iconConfig;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  const cfg = iconConfig[tone] ?? iconConfig.neutral;
  return (
    <div
      className={`flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 border-b border-white/[0.06] last:border-0 ${className}`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] ${cfg.bg} ${cfg.text}`}
      >
        <Icon name={icon} size={14} />
      </span>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
        <dt className="min-w-0 truncate text-xs font-mono text-gray-400">{label}</dt>
        <dd className="text-right shrink-0">
          <span className="block text-xs font-bold text-white font-mono">{value}</span>
          {hint && (
            <span className="block text-[10px] text-gray-500 font-mono leading-tight">{hint}</span>
          )}
        </dd>
      </div>
    </div>
  );
}
