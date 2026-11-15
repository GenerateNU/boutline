import { Skeleton } from "@/components/primitives/skeleton";

function TournamentCardSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-[12px] border border-outline bg-card p-4 shadow-sm">
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3.5 w-1/2" />
      </div>
      <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
    </div>
  );
}

export { TournamentCardSkeleton };
