import { Pagination } from "@/components/primitives/pagination";
import { getEvents } from "@/features/event/services/getEvents";
import { getReferees } from "@/features/referee/services/getReferees";
import { SearchForm } from "@/features/tournament/components/search-form";
import { readOffsetParam, readStringParam } from "@/lib/search-params";

import { RefereeRoster } from "./_components/referee-roster";

const PAGE_SIZE = 20;

export default async function RefereesTab({
  params,
  searchParams,
}: PageProps<"/admin/tournaments/[tournamentId]/referees">) {
  const [{ tournamentId }, query] = await Promise.all([params, searchParams]);

  const search = readStringParam(query, "q");
  const offset = readOffsetParam(query);
  const basePath = `/admin/tournaments/${tournamentId}/referees`;

  const [{ data, total, limit }, events] = await Promise.all([
    getReferees(tournamentId, PAGE_SIZE, offset, search),
    getEvents(tournamentId),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <SearchForm
        action={basePath}
        label="Search referees"
        placeholder="e.g. Yan Wang"
        defaultValue={search}
      />
      <RefereeRoster tournamentId={tournamentId} referees={data} events={events} />
      <Pagination
        total={total}
        limit={limit}
        offset={offset}
        basePath={basePath}
        params={{ q: search }}
      />
    </div>
  );
}
