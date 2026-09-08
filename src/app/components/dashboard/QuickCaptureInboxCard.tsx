"use client";

import { useState } from "react";
import { useToast } from "../ui/Toast";

interface CaptureItem {
  id: string;
  content: string;
  category: "IDEA" | "TASK_CANDIDATE" | "NOTE" | "REMINDER";
  createdAtLabel: string;
  tagLabel: string;
}

interface QuickCaptureProps {
  initialCaptures: CaptureItem[];
}

export function QuickCaptureInboxCard({ initialCaptures }: QuickCaptureProps) {
  const { toast } = useToast();
  const [captures, setCaptures] = useState<CaptureItem[]>(initialCaptures);
  const [filter, setFilter] = useState<"ALL" | "IDEA" | "TASK" | "NOTE" | "BUG">("ALL");
  const [inputVal, setInputVal] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredItems = captures.filter((item) => {
    if (filter === "ALL") return true;
    if (filter === "IDEA") return item.category === "IDEA";
    if (filter === "TASK") return item.category === "TASK_CANDIDATE";
    if (filter === "NOTE") return item.category === "NOTE";
    if (filter === "BUG") return item.category === "TASK_CANDIDATE" || item.content.toLowerCase().includes("bug");
    return true;
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const content = inputVal.trim();
    setInputVal("");
    setLoading(true);

    const targetCategory: "IDEA" | "TASK_CANDIDATE" | "NOTE" | "REMINDER" =
      filter === "IDEA" ? "IDEA" : filter === "NOTE" ? "NOTE" : "TASK_CANDIDATE";

    const newItem: CaptureItem = {
      id: `temp-${Date.now()}`,
      content,
      category: targetCategory,
      createdAtLabel: "Baru saja",
      tagLabel: targetCategory === "IDEA" ? "Ide Baru" : targetCategory === "NOTE" ? "Catatan" : "Kandidat Task",
    };

    setCaptures((prev) => [newItem, ...prev]);
    toast("Catatan tersimpan di Quick Capture Inbox!", "success");

    try {
      const res = await fetch("/api/captures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, category: targetCategory }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.id) {
          setCaptures((prev) =>
            prev.map((c) => (c.id === newItem.id ? { ...c, id: json.data.id } : c))
          );
        }
      }
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }

  async function handleConvert(id: string, target: "PROJECT" | "TASK") {
    try {
      const res = await fetch(`/api/captures/${id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      if (res.ok) {
        toast(`Item berhasil dikonversi ke ${target === "PROJECT" ? "Project" : "Task"}!`, "success");
        setCaptures((prev) => prev.filter((c) => c.id !== id));
      } else {
        toast("Gagal mengonversi item.", "error");
      }
    } catch {
      toast("Terjadi kesalahan jaringan.", "error");
    }
  }

  function getIcon(category: string, content: string) {
    if (content.toLowerCase().includes("bug") || content.toLowerCase().includes("leak")) return "⚡";
    if (category === "IDEA") return "💡";
    if (category === "NOTE") return "📝";
    return "✅";
  }

  return (
    <div className="rounded-xl bg-[#131825] p-4 sm:p-5 border border-white/[0.07] shadow-md flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#d0bcff] text-base">📥</span>
          <h3 className="font-['Hanken_Grotesk',sans-serif] text-base font-bold text-[#e2e2eb]">
            Kotak Catatan Cepat (Inbox)
          </h3>
        </div>
        <span className="font-mono text-[11px] text-[#958ea0]">
          {captures.length} Menunggu
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto py-1">
        <button
          onClick={() => setFilter("ALL")}
          className={`px-2.5 py-0.5 rounded font-mono text-[11px] font-medium transition-colors ${
            filter === "ALL"
              ? "bg-[#d0bcff]/20 text-[#d0bcff] border border-[#d0bcff]/30"
              : "bg-[#0c0e14] hover:bg-[#282a30] text-[#cbc3d7]"
          }`}
        >
          Semua ({captures.length})
        </button>
        <button
          onClick={() => setFilter("IDEA")}
          className={`px-2.5 py-0.5 rounded font-mono text-[11px] transition-colors ${
            filter === "IDEA"
              ? "bg-[#d0bcff]/20 text-[#d0bcff] border border-[#d0bcff]/30"
              : "bg-[#0c0e14] hover:bg-[#282a30] text-[#cbc3d7]"
          }`}
        >
          💡 Ide
        </button>
        <button
          onClick={() => setFilter("TASK")}
          className={`px-2.5 py-0.5 rounded font-mono text-[11px] transition-colors ${
            filter === "TASK"
              ? "bg-[#d0bcff]/20 text-[#d0bcff] border border-[#d0bcff]/30"
              : "bg-[#0c0e14] hover:bg-[#282a30] text-[#cbc3d7]"
          }`}
        >
          ✅ Tugas
        </button>
        <button
          onClick={() => setFilter("NOTE")}
          className={`px-2.5 py-0.5 rounded font-mono text-[11px] transition-colors ${
            filter === "NOTE"
              ? "bg-[#d0bcff]/20 text-[#d0bcff] border border-[#d0bcff]/30"
              : "bg-[#0c0e14] hover:bg-[#282a30] text-[#cbc3d7]"
          }`}
        >
          📝 Catatan
        </button>
        <button
          onClick={() => setFilter("BUG")}
          className={`px-2.5 py-0.5 rounded font-mono text-[11px] transition-colors ${
            filter === "BUG"
              ? "bg-[#d0bcff]/20 text-[#d0bcff] border border-[#d0bcff]/30"
              : "bg-[#0c0e14] hover:bg-[#282a30] text-[#cbc3d7]"
          }`}
        >
          ⚡ Kendala
        </button>
      </div>

      {/* Items List */}
      <div className="flex flex-col gap-2 mt-1">
        {filteredItems.length === 0 && (
          <div className="py-6 px-3 rounded-lg bg-[#0c0e14]/40 border border-dashed border-white/[0.06] text-center flex flex-col items-center justify-center gap-1">
            <span className="text-xl opacity-60">📥</span>
            <p className="text-xs font-mono text-[#cbc3d7]">Kotak Masuk Kosong</p>
            <p className="text-[11px] font-mono text-[#958ea0]">Catat ide, kendala, atau hal penting dengan cepat di kolom bawah.</p>
          </div>
        )}
        {filteredItems.slice(0, 4).map((item) => (
          <div
            key={item.id}
            className="p-2.5 rounded-lg bg-[#0c0e14] hover:bg-[#1A2133] transition-colors flex items-start justify-between gap-2 group border border-white/[0.04]"
          >
            <div className="flex items-start gap-2 min-w-0">
              <span className="text-sm shrink-0 mt-0.5">{getIcon(item.category, item.content)}</span>
              <div className="flex flex-col truncate">
                <span className="font-mono text-xs text-[#e2e2eb] font-medium leading-snug truncate">
                  {item.content}
                </span>
                <span className="font-mono text-[10px] text-[#958ea0] mt-0.5 truncate">
                  {item.createdAtLabel} • {item.tagLabel}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                type="button"
                onClick={() => handleConvert(item.id, "TASK")}
                className="px-2 py-0.5 rounded bg-[#282a30] hover:bg-[#4edea3] hover:text-[#002113] text-[#cbc3d7] font-mono text-[10px] border border-white/[0.06] transition-colors"
                title="Jadikan Tugas"
              >
                → Tugas
              </button>
              <button
                type="button"
                onClick={() => handleConvert(item.id, "PROJECT")}
                className="px-2 py-0.5 rounded bg-[#282a30] hover:bg-[#d0bcff] hover:text-[#3c0091] text-[#958ea0] font-mono text-[10px] border border-white/[0.06] transition-colors"
                title="Jadikan Proyek"
              >
                + Proyek
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Capture Command Bar Input */}
      <form onSubmit={handleAdd} className="relative mt-1">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          disabled={loading}
          placeholder="Tulis ide, kendala, atau catatan cepat... [Enter]"
          className="w-full h-8 pl-3 pr-10 rounded bg-[#282a30] text-[#e2e2eb] placeholder:text-[#958ea0] font-mono text-xs border border-white/[0.07] focus:outline-none focus:bg-[#1A2133] focus:border-[#d0bcff]/40"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-[#958ea0]">
          ⌘I
        </span>
      </form>
    </div>
  );
}
