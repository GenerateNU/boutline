import ListOutlined from "@mui/icons-material/ListOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";

import { Background } from "@/components/primitives/background";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Skeleton } from "@/components/primitives/skeleton";

export default function TableauTabLoading() {
  return (
    <div className="relative isolate -mx-4 h-[calc(100dvh-12.5rem)] overflow-clip bg-fencing-white px-4 pt-4">
      <span role="status" className="sr-only">
        Loading tableau
      </span>
      <Background version={7} />
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center gap-3 pb-4">
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
            <Skeleton key={index} className="h-10 flex-1 rounded-md" />
          ))}
        </div>
        <ul aria-hidden className="flex flex-col gap-4 pt-6">
          {Array.from({ length: 4 }, (_, index) => (
            <li key={index}>
              <Skeleton className="h-26.5 w-full rounded-lg" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
