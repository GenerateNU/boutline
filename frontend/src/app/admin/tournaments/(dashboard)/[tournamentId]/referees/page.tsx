import { ActiveFilterChips } from "@/components/primitives/active-filter-chips";
import { Pagination } from "@/components/primitives/pagination";
import { getEvents } from "@/features/event/services/getEvents";
import { getReferees } from "@/features/referee/services/getReferees";
import { SearchForm } from "@/features/tournament/components/search-form";
import { getTournamentRole } from "@/features/tournament/services/getTournamentRole";
import { readOffsetParam, readStringParam } from "@/lib/search-params";

import { RefereeFilterSheet } from "./_components/referee-filter-sheet";
import { RefereeRoster } from "./_components/referee-roster";

const PAGE_SIZE = 20;

// Anything but a positive whole number leaves the pool filter off, since the API rejects it.
function readPoolParam(value: string) {
  const pool = Number(value);
  return Number.isInteger(pool) && pool > 0 ? pool : undefined;
}

export default async function RefereesTab({
  params,
  searchParams,
}: PageProps<"/admin/tournaments/[tournamentId]/referees">) {
  const [{ tournamentId }, query] = await Promise.all([params, searchParams]);

  const search = readStringParam(query, "q");
  const pool = readPoolParam(readStringParam(query, "pool"));
  const offset = readOffsetParam(query);
  const basePath = `/admin/tournaments/${tournamentId}/referees`;

  // The role decides whether the email filter is sent at all: only admins may search emails.
  const role = await getTournamentRole(tournamentId);
  const isAdmin = role === "admin";
  const email = isAdmin ? readStringParam(query, "email") : "";

  const [{ data, total, limit }, events] = await Promise.all([
    getReferees(tournamentId, PAGE_SIZE, offset, { query: search, email, pool }),
    getEvents(tournamentId),
  ]);
  const poolText = pool ? String(pool) : undefined;
  const filtered = Boolean(search || email || pool);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <SearchForm action={basePath} label="Search referees" placeholder="Search referees" defaultValue={search} />
        <RefereeFilterSheet tournamentId={tournamentId} canSeeEmails={isAdmin} />
      </div>
      <ActiveFilterChips
        filters={[
          { param: "email", name: "Email", value: email },
          { param: "pool", name: "Pool", value: poolText },
        ]}
      />
      <RefereeRoster
        tournamentId={tournamentId}
        referees={data}
        events={events}
        canManage={isAdmin}
        emptyMessage={filtered ? "No referees match these filters." : "No referees yet."}
      />
      <Pagination
        total={total}
        limit={limit}
        offset={offset}
        basePath={basePath}
        params={{ q: search, email, pool: poolText }}
      />
    </div>
  );
}
