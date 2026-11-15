import { Skeleton } from "@/components/primitives/skeleton";

const FENCER_COUNT = 6;
const ROW_CLASS = "grid grid-cols-[6.5rem_repeat(6,minmax(0,1fr))] gap-1";

export function PoolTableSkeleton() {
  return (
    <div className="flex flex-col gap-1">
      <div className={ROW_CLASS}>
        <span />
        {Array.from({ length: FENCER_COUNT }, (_, column) => (
          <Skeleton key={column} className="h-6 rounded-[4px]" />
        ))}
      </div>
      {Array.from({ length: FENCER_COUNT }, (_, row) => (
        <div key={row} className={ROW_CLASS}>
          <div className="flex flex-col justify-center gap-1 pr-1">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3 w-14" />
          </div>
          {Array.from({ length: FENCER_COUNT }, (_, column) => (
            <Skeleton key={column} className="h-9 rounded-[4px]" />
          ))}
        </div>
      ))}
    </div>
  );
}
