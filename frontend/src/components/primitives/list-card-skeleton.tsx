import { Skeleton } from "@/components/primitives/skeleton";

interface ListCardSkeletonProps {
  badge?: boolean;
}

function ListCardSkeleton({ badge = false }: ListCardSkeletonProps) {
  return (
    <div className="flex items-center gap-2.5 rounded-[12px] border border-outline bg-card py-3.5 pr-3 pl-4 shadow-sm">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      {badge && <Skeleton className="h-5 w-10 shrink-0 rounded-sm" />}
      <Skeleton className="size-8 shrink-0 rounded-md" />
    </div>
  );
}

export { ListCardSkeleton };
export type { ListCardSkeletonProps };
