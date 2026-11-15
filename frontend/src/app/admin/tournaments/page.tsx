import { Suspense } from "react";

import { AdminTournamentBrowser } from "@/features/tournament/components/admin-tournament-browser";
import { AdminTournamentBrowserSkeleton } from "@/features/tournament/components/admin-tournament-browser-skeleton";
import { parseTournamentFilters } from "@/features/tournament/lib/tournament-filters";

// A boundary here rather than loading.tsx, which would also wrap /new and
// every tournament dashboard beneath this folder.
export default async function AdminTournamentsPage({
  searchParams,
}: PageProps<"/admin/tournaments">) {
  const query = await searchParams;

  return (
    <Suspense fallback={<AdminTournamentBrowserSkeleton status={parseTournamentFilters(query).status} />}>
      <AdminTournamentBrowser query={query} />
    </Suspense>
  );
}
