import { HeaderSkeleton, TabsSkeleton, MetricCardsSkeleton, ListSkeleton } from "@/app/components/ui/PageSkeleton";

export default function GoalsLoading() {
  return (
    <div className="flex flex-col w-full space-y-6 pb-16">
      <HeaderSkeleton />
      <TabsSkeleton count={3} />
      <MetricCardsSkeleton />
      <ListSkeleton rows={4} />
    </div>
  );
}
