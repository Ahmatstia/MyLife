import { HeaderSkeleton, CardSkeleton, ListSkeleton } from "@/app/components/ui/PageSkeleton";

export default function CalendarLoading() {
  return (
    <div className="flex flex-col w-full space-y-6 pb-16">
      <HeaderSkeleton />
      <CardSkeleton className="h-12 w-64" />
      <CardSkeleton className="h-[520px]" />
      <ListSkeleton rows={3} />
    </div>
  );
}
