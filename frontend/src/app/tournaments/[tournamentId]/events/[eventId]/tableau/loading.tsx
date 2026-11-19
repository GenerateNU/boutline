import ListOutlined from "@mui/icons-material/ListOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";

import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Skeleton } from "@/components/primitives/skeleton";

export default function TableauTabLoading() {
  return (
    <div className="flex flex-col">
      <span role="status" className="sr-only">
        Loading tableau
      </span>
      <div className="flex shrink-0 items-center gap-3 pb-4 max-w-mobile">
        <label className="flex h-11.5 min-w-0 flex-1 items-center gap-2 rounded-[12px] border border-outline bg-background px-4 shadow-sm">
          <Input
            type="text"
            disabled
            aria-label="Search fencers or clubs"
            placeholder="Enter search text"
            className="h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 placeholder:text-neutral-secondary focus-visible:ring-0"
          />
          <SearchOutlined aria-hidden className="size-5 text-neutral-secondary" />
        </label>
        <Button
          variant="outline"
          size="icon"
          disabled
          className="size-11.5 rounded-[12px] border-outline text-neutral-secondary hover:bg-muted"
          aria-label="Show as list"
        >
          <ListOutlined />
        </Button>
      </div>
      <div aria-hidden className="flex gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-10 flex-1 rounded-md lg:w-32 lg:flex-none" />
        ))}
      </div>
      {/* Bracket columns of 4, 2 and 1 bouts, running off the screen edge like the bracket. */}
      <div aria-hidden className="-mx-4 flex gap-11.5 overflow-hidden px-4 pt-6 pb-6">
        {[4, 2, 1].map((bouts) => (
          <ul key={bouts} className="flex w-63.5 shrink-0 flex-col">
            {Array.from({ length: bouts }, (_, index) => (
              <li key={index} className="flex min-h-35 flex-1 items-center">
                <Skeleton className="h-26.5 w-full rounded-lg" />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
