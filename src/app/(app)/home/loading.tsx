import { CardSkeleton, MetricCardsSkeleton, ListSkeleton } from "@/app/components/ui/PageSkeleton";

export default function HomeLoading() {
  return (
    <div className="flex flex-col w-full space-y-6 pb-16">
      {/* Hero banner */}
      <CardSkeleton className="h-40" />
      <MetricCardsSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ListSkeleton rows={4} />
        <ListSkeleton rows={4} />
      </div>
    </div>
  );
}
