import { Pagination } from "@/components/primitives/pagination";
import { CreateTournamentCard } from "@/features/tournament/components/create-tournament-card";
import { StatusTabs } from "@/features/tournament/components/status-tabs";
import { TournamentCard } from "@/features/tournament/components/tournament-card";
import {
  parseTournamentFilters,
  TOURNAMENT_PAGE_SIZE,
} from "@/features/tournament/lib/tournament-filters";
import { getTournaments } from "@/features/tournament/services/getTournaments";

const BASE_PATH = "/admin";

interface AdminTournamentBrowserProps {
  query: Record<string, string | string[] | undefined>;
}

async function AdminTournamentBrowser({ query }: AdminTournamentBrowserProps) {
  const { offset, status } = parseTournamentFilters(query);
  const { data, total, limit } = await getTournaments(
    TOURNAMENT_PAGE_SIZE,
    offset,
    { status },
  );

  return (
    <main className="mx-auto flex w-full max-w-mobile flex-1 flex-col gap-5 px-5 pt-5 pb-6 font-manrope">
      <CreateTournamentCard />

      <div className="flex flex-col gap-1.25 pt-1.25">
        <h1 className="px-1 text-xl font-semibold text-obsidian">
          Manage Tournaments
        </h1>
        <StatusTabs basePath={BASE_PATH} status={status} />
      </div>

      {data.length === 0 && (
        <p className="text-sm text-neutral-secondary">No tournaments found.</p>
      )}

      <ul className="flex flex-col gap-5">
        {data.map((tournament) => (
          <li key={tournament.id}>
            <TournamentCard tournament={tournament} admin />
          </li>
        ))}
      </ul>

      <Pagination
        total={total}
        limit={limit}
        offset={offset}
        basePath={BASE_PATH}
        params={{ status }}
      />
    </main>
  );
}

export { AdminTournamentBrowser };
