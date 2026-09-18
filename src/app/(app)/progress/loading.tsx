import { HeaderSkeleton, TabsSkeleton, MetricCardsSkeleton, BentoGridSkeleton } from "@/app/components/ui/PageSkeleton";

export default function ProgressLoading() {
  return (
    <div className="flex flex-col w-full space-y-6 pb-16">
      <HeaderSkeleton />
      <TabsSkeleton count={4} />
      <MetricCardsSkeleton />
      <BentoGridSkeleton />
    </div>
  );
}
