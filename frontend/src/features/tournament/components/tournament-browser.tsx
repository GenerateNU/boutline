import { cn } from "cn";
import { format } from "date-fns";

import { Pagination } from "@/components/primitives/pagination";
import { CalendarView } from "@/features/tournament/components/calendar-view";
import { CreateTournamentCard } from "@/features/tournament/components/create-tournament-card";
import { FilterSheet } from "@/features/tournament/components/filter-sheet";
import { SearchForm } from "@/features/tournament/components/search-form";
import { TournamentCard } from "@/features/tournament/components/tournament-card";
import { WeekStrip } from "@/features/tournament/components/week-strip";
import { parseTournamentFilters } from "@/features/tournament/lib/tournament-filters";
import { getTournaments } from "@/features/tournament/services/getTournaments";
import type { TournamentVisibility } from "@/features/tournament/types/tournament";

const PAGE_SIZE = 20;

type TournamentBrowserProps = {
  basePath: string;
  query: Record<string, string | string[] | undefined>;
  canCreate?: boolean;
  visibility?: TournamentVisibility;
};

async function TournamentBrowser({
  basePath,
  query,
  canCreate = false,
  visibility,
}: TournamentBrowserProps) {
  const { offset, status, day, date, calendarView, search, tz } =
    parseTournamentFilters(query);

  const { data, total, limit } = await getTournaments(PAGE_SIZE, offset, {
    query: search,
    status,
    visibility,
    date,
    timeZone: tz,
  });

  return (
    <main className="mx-auto flex w-full max-w-mobile flex-col px-5 pb-5 font-satoshi">
      {calendarView ? (
        <>
          <div className="pt-6">
            <CalendarView />
          </div>
          <div className="flex items-end justify-between pt-2.5 pb-1.5">
            <div className="flex flex-col gap-2.5 pt-2.5">
              <h1 className="text-xl leading-6 font-medium">Tournaments</h1>
              {day && (
                <p className="leading-5 font-medium">
                  {format(day, "MMMM d, yyyy")}
                </p>
              )}
            </div>
            <FilterSheet />
          </div>
        </>
      ) : (
        <>
          {canCreate && (
            <div className="pt-5">
              <CreateTournamentCard />
            </div>
          )}
          <div className="flex items-center gap-2.5 pt-5">
            <SearchForm
              action={basePath}
              label="Search tournaments"
              placeholder="e.g. Fall Open 2026"
              defaultValue={search}
            />
            <FilterSheet />
          </div>
          <h1 className="pt-5 text-xl leading-6 font-medium uppercase">
            Tournaments
          </h1>
          <div className="pt-4">
            <WeekStrip />
          </div>
        </>
      )}

      {data.length === 0 && (
        <p className="pt-2.5 text-sm text-muted-foreground">
          {search
            ? `No tournaments match "${search}".`
            : "No tournaments found."}
        </p>
      )}

      <ul
        className={cn(
          "flex flex-col pt-2.5",
          calendarView ? "gap-2.5" : "gap-5",
        )}
      >
        {data.map((tournament) => (
          <li key={tournament.id}>
            <TournamentCard tournament={tournament} />
          </li>
        ))}
      </ul>

      <div className="pt-5">
        <Pagination
          total={total}
          limit={limit}
          offset={offset}
          basePath={basePath}
          params={{
            q: search,
            status,
            date,
            tz: date ? tz : undefined,
            view: calendarView ? "calendar" : undefined,
          }}
        />
      </div>
    </main>
  );
}

export { TournamentBrowser };
