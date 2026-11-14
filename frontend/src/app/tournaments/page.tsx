import { Suspense } from "react";

import { TournamentBrowser } from "@/features/tournament/components/tournament-browser";
import { TournamentBrowserSkeleton } from "@/features/tournament/components/tournament-browser-skeleton";
import { WeekStrip } from "@/features/tournament/components/week-strip";

// A boundary here rather than loading.tsx, which would also wrap every
// /tournaments/[tournamentId] page and flash before their own tab bars. The
// strip sits outside it so it stays put while the list loads.
export default async function TournamentsPage({
  searchParams,
}: PageProps<"/tournaments">) {
  return (
    <>
      <WeekStrip />
      <Suspense fallback={<TournamentBrowserSkeleton />}>
        <TournamentBrowser
          basePath="/tournaments"
          query={await searchParams}
          visibility="public"
        />
      </Suspense>
    </>
  );
}
