import { Suspense } from "react";

import { readStringParam } from "@/lib/search-params";

import { PoolListSection } from "./_components/pool-list-section";
import { PoolListSkeleton } from "./_components/pool-list-skeleton";
import { PoolStageResultsSection } from "./_components/pool-stage-results-section";
import { PoolStageResultsSkeleton } from "./_components/pool-stage-results-skeleton";
import { PoolingViewTabs } from "./_components/pooling-view-tabs";
import { poolingView } from "./_services/pooling-view";

interface PoolingTabProps
  extends PageProps<"/tournaments/[tournamentId]/events/[eventId]/pooling"> {}

export default async function PoolingTab({ params, searchParams }: PoolingTabProps) {
  const [{ tournamentId, eventId }, query] = await Promise.all([params, searchParams]);
  const view = poolingView(readStringParam(query, "view"));

  return (
    <div className="flex flex-col gap-6 font-manrope">
      <PoolingViewTabs />
      {/* Keyed by view, since a search-param change alone doesn't show loading.tsx again. */}
      {view === "results" ? (
        <Suspense key={view} fallback={<PoolStageResultsSkeleton />}>
          <PoolStageResultsSection eventId={eventId} />
        </Suspense>
      ) : (
        <Suspense key={view} fallback={<PoolListSkeleton />}>
          <PoolListSection tournamentId={tournamentId} eventId={eventId} />
        </Suspense>
      )}
    </div>
  );
}
