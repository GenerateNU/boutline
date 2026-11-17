import { Skeleton } from "@/components/primitives/skeleton";

const CARD_COUNT = 3;

// A placeholder shaped like a list of event cards until a ticket defines what this tab shows.
export default function EventsTab() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-secondary">Event management is coming soon.</p>
      <ul aria-hidden className="flex flex-col gap-5">
        {Array.from({ length: CARD_COUNT }, (_, index) => (
          <li
            key={index}
            className="flex flex-col gap-3 rounded-[12px] border border-outline bg-card p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3.5 w-1/2" />
              </div>
              <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 flex-1 rounded-full" />
              <Skeleton className="h-9 flex-1 rounded-full" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
