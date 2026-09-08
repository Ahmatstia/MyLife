"use client";

interface RadarItem {
  id: string;
  title: string;
  subtitle: string;
  urgencyColor: "coral-rose" | "secondary" | "tertiary";
  badgeText: string;
}

interface RadarProps {
  items: RadarItem[];
}

export function UpcomingRadarCard({ items }: RadarProps) {
  function getDotColor(color: RadarItem["urgencyColor"]) {
    switch (color) {
      case "coral-rose":
        return "bg-[#F43F5E]";
      case "secondary":
        return "bg-[#c0c1ff]";
      case "tertiary":
      default:
        return "bg-[#4edea3]";
    }
  }

  function getBadgeClasses(color: RadarItem["urgencyColor"]) {
    switch (color) {
      case "coral-rose":
        return "bg-[#F43F5E]/20 text-[#F43F5E]";
      case "secondary":
        return "bg-[#c0c1ff]/20 text-[#c0c1ff]";
      case "tertiary":
      default:
        return "bg-[#4edea3]/20 text-[#4edea3]";
    }
  }

  return (
    <div className="rounded-xl bg-[#131825] p-4 sm:p-5 border border-white/[0.07] shadow-md flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#F43F5E] text-base font-bold">🎯</span>
          <h3 className="font-['Hanken_Grotesk',sans-serif] text-base font-bold text-[#e2e2eb]">
            Radar Tenggat 72 Jam
          </h3>
        </div>
        <span className="font-mono text-[11px] text-[#958ea0]">
          Tenggat Waktu &amp; Agenda
        </span>
      </div>

      {/* Timeline Items */}
      <div className="flex flex-col gap-2">
        {items.length === 0 && (
          <div className="py-6 px-3 rounded-lg bg-[#0c0e14]/40 border border-dashed border-white/[0.06] text-center flex flex-col items-center justify-center gap-1">
            <span className="text-xl opacity-60">🎯</span>
            <p className="text-xs font-mono text-[#cbc3d7]">Jadwal 72 Jam Mendatang Bersih</p>
            <p className="text-[11px] font-mono text-[#958ea0]">Tidak ada batas waktu atau agenda mendesak dalam 3 hari ke depan.</p>
          </div>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="p-2.5 rounded-lg bg-[#0c0e14] flex items-center justify-between gap-2 border border-white/[0.03]"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-2 h-2 rounded-full shrink-0 ${getDotColor(item.urgencyColor)}`}></div>
              <div className="flex flex-col truncate">
                <span className="font-mono text-xs text-[#e2e2eb] truncate font-medium">
                  {item.title}
                </span>
                <span className="font-mono text-[10px] text-[#958ea0] truncate">
                  {item.subtitle}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${getBadgeClasses(
                  item.urgencyColor
                )}`}
              >
                {item.badgeText}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
