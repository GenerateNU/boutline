import { Skeleton } from "@/components/primitives/skeleton";

import { EventTabNav } from "./_components/event-tab-nav";

// Sits above the event layout, so it covers every tab: only the tabs and the back
// link are drawn, and each tab's own skeleton follows once the layout resolves.
export default function EventLoading() {
  return (
    <div className="flex flex-col">
      <span role="status" className="sr-only">
        Loading event
      </span>
      <EventTabNav />
      <div className="mx-auto flex w-full max-w-mobile flex-col gap-4 px-4 pt-4 pb-20">
        <Skeleton className="h-5 w-40 self-start" />
      </div>
    </div>
  );
}
