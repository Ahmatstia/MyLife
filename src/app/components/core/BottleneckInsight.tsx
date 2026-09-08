import Link from "next/link";
import { Icon } from "../ui/Icon";

type Bottleneck = {
  taskId: string;
  taskName: string;
  reason: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
};

const severityLabel: Record<Bottleneck["severity"], string> = {
  HIGH: "Tinggi",
  MEDIUM: "Sedang",
  LOW: "Rendah",
};

export function BottleneckInsight({
  bottlenecks,
  className = "",
}: {
  bottlenecks: Bottleneck[];
  className?: string;
}) {
  if (!bottlenecks || bottlenecks.length === 0) {
    return (
      <section className={`rounded-2xl border border-[#4edea3]/30 bg-[#131825] p-5 shadow-lg relative overflow-hidden ${className}`}>
        <div className="flex items-start gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4edea3]/15 text-[#4edea3] border border-[#4edea3]/30">
            <Icon name="gauge" size={18} />
          </span>
          <div>
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <span>SISTEM BERJALAN OPTIMAL</span>
              <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse" />
            </h3>
            <p className="mt-1 text-xs text-gray-400 font-mono leading-relaxed">
              Tidak ada hambatan kritis terdeteksi. Seluruh pekerjaan aktif Anda berjalan normal sesuai target.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const item = bottlenecks[0];

  return (
    <section className={`rounded-2xl border border-[#F59E0B]/30 bg-[#131825] p-5 shadow-lg relative overflow-hidden ${className}`}>
      <div className="flex items-start gap-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
          <Icon name="alert" size={18} />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-white font-mono">
              POTENSI HAMBATAN TERDETEKSI
            </h3>
            <span
              className={`font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                item.severity === "HIGH"
                  ? "bg-rose-500/20 text-[#F43F5E] border-rose-500/30"
                  : "bg-amber-500/20 text-[#F59E0B] border-amber-500/30"
              }`}
            >
              Prioritas {severityLabel[item.severity]}
            </span>
          </div>
          <p className="text-sm font-semibold text-white pt-0.5">{item.taskName}</p>
          <p className="text-xs text-gray-400 font-mono leading-relaxed">{item.reason}</p>
          <div className="pt-2">
            <Link
              href={`/tasks/${item.taskId}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#282a30] hover:bg-[#1A2133] text-xs font-mono text-[#c0c1ff] hover:text-white border border-white/[0.08] transition-all cursor-pointer"
            >
              <span>Periksa Task</span>
              <Icon name="arrowRight" size={13} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
