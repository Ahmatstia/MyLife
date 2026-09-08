"use client";

import { useState } from "react";
import { Icon } from "@/app/components/ui/Icon";
import { HistoryDeleteButton } from "@/app/components/ui/HistoryDeleteButton";

export type TimelineEntry = {
  id: string;
  kind: "capture" | "session" | "review";
  title: string;
  subtitle?: string;
  content: string;
  timestamp: string;
  tag?: string;
  entityId: string;
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function NotesTimeline({ entries }: { entries: TimelineEntry[] }) {
  const [filter, setFilter] = useState<"all" | "capture" | "session" | "review">("all");

  const filtered = entries.filter((e) => {
    if (filter === "all") return true;
    return e.kind === filter;
  });

  const countByKind = {
    all: entries.length,
    capture: entries.filter((e) => e.kind === "capture").length,
    session: entries.filter((e) => e.kind === "session").length,
    review: entries.filter((e) => e.kind === "review").length,
  };

  const kindStyle: Record<TimelineEntry["kind"], { bg: string; text: string; border: string; icon: "inbox" | "clock" | "sparkles"; label: string }> = {
    capture: {
      bg: "bg-[#8B5CF6]/15",
      border: "border-[#8B5CF6]/30",
      text: "text-[#d0bcff]",
      icon: "inbox",
      label: "Catatan Cepat",
    },
    session: {
      bg: "bg-[#F59E0B]/15",
      border: "border-[#F59E0B]/30",
      text: "text-[#F59E0B]",
      icon: "clock",
      label: "Sesi & Hambatan",
    },
    review: {
      bg: "bg-[#4edea3]/15",
      border: "border-[#4edea3]/30",
      text: "text-[#4edea3]",
      icon: "sparkles",
      label: "Refleksi Mingguan",
    },
  };

  return (
    <section className="space-y-4">
      {/* Header & filter tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[#94A3B8]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6]"></span>
            <span>ARSIP PEMIKIRAN // TELEMETRI REFLEKSI</span>
          </div>
          <h2 className="mt-1 text-xl font-bold text-white tracking-tight">Timeline Catatan & Refleksi</h2>
          <p className="mt-0.5 text-[12.5px] text-[#94A3B8]">
            Jejak pemikiran, hambatan yang dihadapi, dan pembelajaran sepanjang perjalanan hidup Anda.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex rounded-xl border border-white/[0.08] bg-[#0B0D13] p-1 text-[12px]">
          {[
            { key: "all", label: "Semua", count: countByKind.all },
            { key: "capture", label: "Catatan", count: countByKind.capture },
            { key: "session", label: "Sesi", count: countByKind.session },
            { key: "review", label: "Review", count: countByKind.review },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key as typeof filter)}
              className={`rounded-lg px-2.5 py-1 font-medium transition-all ${
                filter === tab.key
                  ? "bg-[#131825] text-white shadow-sm border border-white/[0.08]"
                  : "text-[#94A3B8] hover:text-white"
              }`}
            >
              {tab.label} <span className="text-[10px] font-mono text-[#64748B]">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid of note cards */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.08] bg-[#131825]/40 p-8 text-center">
          <p className="text-[13px] text-[#94A3B8]">Belum ada catatan dalam kategori ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => {
            const cfg = kindStyle[item.kind];
            return (
              <div
                key={item.id}
                className="group flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#131825] p-5 shadow-lg transition-all hover:border-white/[0.16] hover:bg-[#1A2133]/60"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10.5px] font-bold font-mono ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                        <Icon name={cfg.icon} size={11} />
                        {cfg.label}
                      </span>
                      {item.tag && (
                        <span className="truncate max-w-[160px] text-[11px] font-medium text-[#94A3B8] bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                          {item.tag}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-[10.5px] font-mono text-[#64748B]">
                      {formatDate(item.timestamp)}
                    </span>
                  </div>

                  <h3 className="text-[14px] font-semibold text-white leading-snug">
                    {item.title}
                  </h3>

                  {item.subtitle && (
                    <p className="mt-1 text-[11.5px] font-medium text-[#d0bcff]">
                      {item.subtitle}
                    </p>
                  )}

                  <p className="mt-2.5 text-[12.5px] leading-relaxed text-[#CBC3D7] whitespace-pre-wrap line-clamp-6">
                    {item.content}
                  </p>
                </div>

                {item.kind === "capture" && (
                  <div className="mt-4 flex justify-end pt-3 border-t border-white/[0.06]">
                    <HistoryDeleteButton
                      path={`/api/captures/${item.entityId}`}
                      message="Hapus catatan ini?"
                      toastMessage="Catatan dihapus."
                      aria-label="Hapus catatan"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
