import { useId, type ReactNode } from "react";

// Focus Orb — signature component.
// Lingkaran kemajuan untuk satu angka penting: progress goal, persentase fokus,
// atau "waktu berjalan" pada sesi. Satu fokus per orb = satu makna.
// value 0-100. Tanpa value = ring kosong (dipakai timer lewat prop `sweep`
// agar terasa hidup tanpa mengeklaim target durasi).

const tones = {
  primary: {
    from: "#c0c1ff",
    to: "#7c3aed",
    track: "stroke-white/[0.08]",
  },
  success: {
    from: "#4edea3",
    to: "#059669",
    track: "stroke-white/[0.08]",
  },
  ai: {
    from: "#d0bcff",
    to: "#a078ff",
    track: "stroke-white/[0.08]",
  },
  warning: {
    from: "#F59E0B",
    to: "#d97706",
    track: "stroke-white/[0.08]",
  },
} as const;

export function FocusOrb({
  value,
  size = 84,
  stroke = 6,
  tone = "primary",
  sweep = false,
  label,
  children,
  className = "",
}: {
  value?: number;
  size?: number;
  stroke?: number;
  tone?: keyof typeof tones;
  sweep?: boolean;
  label?: string;
  children?: ReactNode;
  className?: string;
}) {
  const gradId = useId();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = value == null ? null : Math.max(0, Math.min(100, value));
  const offset =
    percent == null ? circumference : circumference * (1 - percent / 100);
  const t = tones[tone];
  const gradientId = `orb-grad-${gradId}`;

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={t.from} />
            <stop offset="100%" stopColor={t.to} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className={t.track}
        />
        {percent != null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            stroke={`url(#${gradientId})`}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        )}
      </svg>
      {percent === 100 && <span aria-hidden="true" className="halo" />}
      {sweep && (
        <span
          aria-hidden="true"
          className="sweep-dot pointer-events-none absolute inset-0"
        >
          <span className="absolute -top-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-ai-500/80" />
        </span>
      )}
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        {children}
      </span>
    </div>
  );
}
