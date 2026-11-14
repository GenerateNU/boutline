import { Skeleton } from "@/components/primitives/skeleton";

const CARD_COUNT = 5;

// Mirrors TournamentBrowser's layout so the page doesn't jump when results arrive.
function TournamentBrowserSkeleton() {
  return (
    <div role="status" className="flex flex-1 flex-col">
      <span className="sr-only">Loading tournaments</span>
      <div aria-hidden className="h-12 bg-obsidian shadow-md" />
      <div className="mx-auto flex w-full max-w-mobile flex-1 flex-col bg-background pb-5">
        <div className="flex items-center gap-2.5 px-5 pt-3.5 pb-2.5">
          <Skeleton className="h-11.5 flex-1 rounded-[12px]" />
          <Skeleton className="size-11.5 rounded-[12px]" />
        </div>

        <div className="flex items-center justify-between px-6 py-1.25">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="size-6 rounded-full" />
        </div>

        <ul aria-hidden className="flex flex-col gap-5 px-5 pt-2.5">
          {Array.from({ length: CARD_COUNT }, (_, index) => (
            <li
              key={index}
              className="flex items-start gap-3 rounded-[12px] border border-outline bg-card p-4 shadow-sm"
            >
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3.5 w-1/2" />
              </div>
              <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export { TournamentBrowserSkeleton };
