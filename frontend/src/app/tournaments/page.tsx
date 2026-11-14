import { Suspense } from "react";

import { Loading } from "@/components/primitives/loading";
import { TournamentBrowser } from "@/features/tournament/components/tournament-browser";

// A boundary here rather than loading.tsx, which would also wrap every
// /tournaments/[tournamentId] page and flash before their own tab bars.
export default async function TournamentsPage({
  searchParams,
}: PageProps<"/tournaments">) {
  return (
    <Suspense fallback={<Loading />}>
      <TournamentBrowser
        basePath="/tournaments"
        query={await searchParams}
        visibility="public"
      />
    </Suspense>
  );
}
