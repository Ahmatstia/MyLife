import { HeaderSkeleton, MetricCardsSkeleton, CardSkeleton, ListSkeleton } from "@/app/components/ui/PageSkeleton";

export default function TodayLoading() {
  return (
    <div className="flex flex-col w-full space-y-6 pb-16">
      <HeaderSkeleton />
      <MetricCardsSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <ListSkeleton rows={5} />
        </div>
        <div className="space-y-4">
          <CardSkeleton className="h-48" />
          <CardSkeleton className="h-36" />
        </div>
      </div>
    </div>
  );
}
