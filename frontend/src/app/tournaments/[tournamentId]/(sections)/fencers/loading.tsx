import { Skeleton } from "@/components/primitives/skeleton";
import { FencerBrowserSkeleton } from "@/features/competitor/components/fencer-browser-skeleton";

export default function FencersLoading() {
  return (
    <div className="flex flex-col gap-4">
      <span role="status" className="sr-only">
        Loading fencers
      </span>
      <Skeleton className="h-7 w-2/3" />
      <FencerBrowserSkeleton />
    </div>
  );
}
