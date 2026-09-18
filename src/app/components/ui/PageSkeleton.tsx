/**
 * Reusable skeleton building blocks for page loading states.
 * Used inside each route's loading.tsx to prevent blank screen during data fetch.
 */

function SkeletonBox({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl bg-white/[0.04] border border-white/[0.05] animate-pulse ${className}`} />
  );
}

function SkeletonText({ className = "" }: { className?: string }) {
  return <div className={`h-3 rounded-full bg-white/[0.05] animate-pulse ${className}`} />;
}

/** 4 metric cards in a row */
export function MetricCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonBox key={i} className="h-28" />
      ))}
    </div>
  );
}

/** Generic header skeleton (breadcrumb + title) */
export function HeaderSkeleton() {
  return (
    <div className="space-y-3 border-b border-white/[0.08] pb-6">
      <SkeletonText className="w-48" />
      <SkeletonText className="w-64 h-7" />
      <SkeletonText className="w-96" />
    </div>
  );
}

/** Tab bar skeleton */
export function TabsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.05] w-fit animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-9 w-28 rounded-lg bg-white/[0.04]" />
      ))}
    </div>
  );
}

/** Large card skeleton */
export function CardSkeleton({ className = "" }: { className?: string }) {
  return <SkeletonBox className={`${className}`} />;
}

/** Two-column bento grid skeleton */
export function BentoGridSkeleton() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <div className="xl:col-span-7 flex flex-col gap-6">
        <SkeletonBox className="h-48" />
        <SkeletonBox className="h-56" />
        <SkeletonBox className="h-40" />
      </div>
      <div className="xl:col-span-5 flex flex-col gap-6">
        <SkeletonBox className="h-48" />
        <SkeletonBox className="h-56" />
      </div>
    </div>
  );
}

/** List skeleton (card rows) */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBox key={i} className="h-20" />
      ))}
    </div>
  );
}
