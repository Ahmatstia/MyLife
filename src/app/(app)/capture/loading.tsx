import { HeaderSkeleton, MetricCardsSkeleton, ListSkeleton } from "@/app/components/ui/PageSkeleton";

export default function CaptureLoading() {
  return (
    <div className="flex flex-col w-full space-y-6 pb-16">
      <HeaderSkeleton />
      <MetricCardsSkeleton />
      <ListSkeleton rows={6} />
    </div>
  );
}
