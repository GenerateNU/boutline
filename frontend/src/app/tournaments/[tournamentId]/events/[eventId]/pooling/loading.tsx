"use client";

import { useSearchParams } from "next/navigation";

import { PoolListSkeleton } from "./_components/pool-list-skeleton";
import { PoolStageResultsSkeleton } from "./_components/pool-stage-results-skeleton";
import { PoolingViewTabs } from "./_components/pooling-view-tabs";
import { poolingView } from "./_services/pooling-view";

export default function PoolingTabLoading() {
  const view = poolingView(useSearchParams().get("view"));

  return (
    <div className="flex flex-col gap-6 font-manrope">
      <PoolingViewTabs />
      {view === "results" ? <PoolStageResultsSkeleton /> : <PoolListSkeleton />}
    </div>
  );
}
