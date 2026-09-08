import { formatDuration } from "@/lib/format";

export default function AnalyticsBars({
  trends,
}: {
  trends: { date: string; learningMinutes: number; learningHours: number; completedTasks: number }[];
}) {
  const maxMinutes = Math.max(...trends.map((item) => item.learningMinutes), 1);
  const maxTasks = Math.max(...trends.map((item) => item.completedTasks), 1);
  const hasData = trends.some((item) => item.learningMinutes > 0 || item.completedTasks > 0);

  if (!hasData) {
    return <p className="py-4 text-xs font-mono text-gray-500">Belum ada data aktivitas pada periode ini.</p>;
  }

  return (
    <div className="space-y-3">
      {trends.slice(-14).map((item) => (
        <div key={item.date} className="grid grid-cols-[3.5rem_1fr_5.5rem] items-center gap-3 text-xs font-mono">
          <span className="text-gray-400">{item.date.slice(5)}</span>
          <div className="space-y-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-[#1e1f26]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#818cf8] to-[#c0c1ff]"
                style={{ width: `${(item.learningMinutes / maxMinutes) * 100}%` }}
                title={`${formatDuration(item.learningMinutes)} fokus`}
              />
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#1e1f26]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#34d399] to-[#4edea3]"
                style={{ width: `${(item.completedTasks / maxTasks) * 100}%` }}
                title={`${item.completedTasks} task selesai`}
              />
            </div>
          </div>
          <span className="text-right text-gray-400 text-[11px]">
            {formatDuration(item.learningMinutes)} · {item.completedTasks}
          </span>
        </div>
      ))}
    </div>
  );
}