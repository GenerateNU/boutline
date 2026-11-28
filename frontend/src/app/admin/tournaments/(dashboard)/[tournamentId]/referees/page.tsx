import { ActiveFilterChips } from "@/components/primitives/active-filter-chips";
import { Pagination } from "@/components/primitives/pagination";
import { getEvents } from "@/features/event/services/getEvents";
import { getReferees } from "@/features/referee/services/getReferees";
import { SearchForm } from "@/features/tournament/components/search-form";
import { getTournamentRole } from "@/features/tournament/services/getTournamentRole";
import { readOffsetParam, readStringParam } from "@/lib/search-params";

import { RefereeFilterSheet } from "./_components/referee-filter-sheet";
import { RefereeRoster } from "./_components/referee-roster";
import { getTournamentPools } from "./_services/get-tournament-pools";

const PAGE_SIZE = 20;

export default async function RefereesTab({
  params,
  searchParams,
}: PageProps<"/admin/tournaments/[tournamentId]/referees">) {
  const [{ tournamentId }, query] = await Promise.all([params, searchParams]);

  const search = readStringParam(query, "q");
  const offset = readOffsetParam(query);
  const basePath = `/admin/tournaments/${tournamentId}/referees`;

  const [role, events] = await Promise.all([getTournamentRole(tournamentId), getEvents(tournamentId)]);
  const pools = await getTournamentPools(events);
  // Only admins may search emails, and only one of this tournament's pools is sent,
  // so a stale or hand-edited URL narrows nothing instead of failing the page.
  const isAdmin = role === "admin";
  const email = isAdmin ? readStringParam(query, "email") : "";
  const pool = pools.find(({ id }) => id === readStringParam(query, "pool"));

  const { data, total, limit } = await getReferees(tournamentId, PAGE_SIZE, offset, {
    query: search,
    email,
    pool: pool?.id,
  });
  const filtered = Boolean(search || email || pool);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <SearchForm action={basePath} label="Search referees" placeholder="Search referees" defaultValue={search} />
        <RefereeFilterSheet tournamentId={tournamentId} canSeeEmails={isAdmin} pools={pools} />
      </div>
      <ActiveFilterChips
        filters={[
          { param: "email", name: "Email", value: email },
          { param: "pool", name: "Pool", value: pool?.label },
        ]}
      />
      <RefereeRoster
        tournamentId={tournamentId}
        referees={data}
        pools={pools}
        canManage={isAdmin}
        emptyMessage={filtered ? "No referees match these filters." : "No referees yet."}
      />
      <Pagination
        total={total}
        limit={limit}
        offset={offset}
        basePath={basePath}
        params={{ q: search, email, pool: pool?.id }}
      />
    </div>
  );
}
