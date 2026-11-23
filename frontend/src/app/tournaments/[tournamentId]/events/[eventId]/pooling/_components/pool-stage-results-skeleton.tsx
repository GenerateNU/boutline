import { SearchBar } from "@/components/primitives/search-bar";
import { Skeleton } from "@/components/primitives/skeleton";

const ROW_COUNT = 8;

export function PoolStageResultsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <span role="status" className="sr-only">
        Loading pool results
      </span>
      <div className="flex gap-2">
        <SearchBar
          type="search"
          aria-label="Search pool results"
          placeholder="Search pool results"
          disabled
          className="flex-1"
        />
        <Skeleton className="size-11.5 rounded-[12px]" />
      </div>
      <div aria-hidden className="overflow-hidden rounded-[12px] border border-outline bg-card">
        <div className="flex gap-4 bg-blue-lightest px-3 py-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
        <ul className="divide-y divide-outline border-t border-outline">
          {Array.from({ length: ROW_COUNT }, (_, index) => (
            <li key={index} className="flex items-center gap-3 px-2 py-3">
              <Skeleton className="h-4 w-4 shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Skeleton className="h-4 w-32 max-w-full" />
                <Skeleton className="h-3 w-24 max-w-full" />
              </div>
              <Skeleton className="size-3 shrink-0 rounded-full" />
              <Skeleton className="h-4 w-20 shrink-0" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
