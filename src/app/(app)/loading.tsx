export default function AppLoading() {
  return (
    <div className="w-full max-w-[1400px] mx-auto animate-pulse space-y-6 pt-2 select-none pointer-events-none">
      {/* Top Banner Skeleton */}
      <div className="h-16 w-full rounded-2xl bg-white/[0.03] border border-white/[0.05]" />

      {/* Metrics Bento Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="h-28 rounded-2xl bg-white/[0.03] border border-white/[0.05]" />
        <div className="h-28 rounded-2xl bg-white/[0.03] border border-white/[0.05]" />
        <div className="h-28 rounded-2xl bg-white/[0.03] border border-white/[0.05]" />
        <div className="h-28 rounded-2xl bg-white/[0.03] border border-white/[0.05]" />
      </div>

      {/* Main Content Area Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-96 rounded-2xl bg-white/[0.03] border border-white/[0.05]" />
        <div className="h-96 rounded-2xl bg-white/[0.03] border border-white/[0.05]" />
      </div>
    </div>
  );
}
