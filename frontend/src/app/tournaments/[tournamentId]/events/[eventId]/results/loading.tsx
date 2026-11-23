import { ListCardSkeleton } from "@/components/primitives/list-card-skeleton";
import { Skeleton } from "@/components/primitives/skeleton";
import { EventTabBackground } from "../_components/event-tab-background";

export default function ResultsTabLoading() {
  return (
    <div className="relative isolate -mx-4 h-[calc(100dvh-12.5rem)] overflow-clip bg-fencing-white px-4 pt-4">
      <span role="status" className="sr-only">
        Loading results
      </span>
      <EventTabBackground />
      <div aria-hidden className="flex flex-col gap-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-17 w-42.5 rounded-[12px]" />
        <Skeleton className="h-7 w-32" />
        <ul className="flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, index) => (
            <li key={index}>
              <ListCardSkeleton badge />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
