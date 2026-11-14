import { Suspense } from "react";

import { TournamentBrowser } from "@/features/tournament/components/tournament-browser";
import { TournamentBrowserSkeleton } from "@/features/tournament/components/tournament-browser-skeleton";

// A boundary here rather than loading.tsx, which would also wrap every
// /tournaments/[tournamentId] page and flash before their own tab bars.
export default async function TournamentsPage({
  searchParams,
}: PageProps<"/tournaments">) {
  return (
    <Suspense fallback={<TournamentBrowserSkeleton />}>
      <TournamentBrowser
        basePath="/tournaments"
        query={await searchParams}
        visibility="public"
      />
    </Suspense>
  );
}
