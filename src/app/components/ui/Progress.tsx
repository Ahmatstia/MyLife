export function ProgressBar({
  value,
  size = "md",
  tone = "primary",
  label,
  animated = true,
}: {
  value: number;
  size?: "sm" | "md" | "lg";
  tone?: "primary" | "success" | "ai" | "info" | "warning";
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const height =
    size === "sm" ? "h-1" : size === "lg" ? "h-2.5" : "h-1.5";
  const fill =
    tone === "success"
      ? "progress-gradient-success"
      : tone === "ai"
        ? "progress-gradient-ai"
        : tone === "warning"
          ? "progress-gradient-warning"
          : "progress-gradient-primary";

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={`w-full overflow-hidden rounded-full bg-[#1e1f26] border border-white/[0.06] ${height}`}
      >
        <div
          className={`h-full rounded-full ${fill} ${animated ? "transition-all duration-700 ease-out" : ""}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
