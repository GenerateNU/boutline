import { Pagination } from "@/components/primitives/pagination";
import { ActiveFilterChips } from "@/features/tournament/components/active-filter-chips";
import { CalendarButton } from "@/features/tournament/components/calendar-button";
import { CalendarView } from "@/features/tournament/components/calendar-view";
import { FilterSheet } from "@/features/tournament/components/filter-sheet";
import { SearchForm } from "@/features/tournament/components/search-form";
import { TournamentCard } from "@/features/tournament/components/tournament-card";
import { WeekStrip } from "@/features/tournament/components/week-strip";
import {
  parseTournamentFilters,
  TOURNAMENT_PAGE_SIZE,
} from "@/features/tournament/lib/tournament-filters";
import { getTournaments } from "@/features/tournament/services/getTournaments";
import type { TournamentVisibility } from "@/features/tournament/types/tournament";

interface TournamentBrowserProps {
  basePath: string;
  query: Record<string, string | string[] | undefined>;
  visibility?: TournamentVisibility;
}

async function TournamentBrowser({
  basePath,
  query,
  visibility,
}: TournamentBrowserProps) {
  const { offset, status, date, calendarView, search, tz, club, country } =
    parseTournamentFilters(query);

  const { data, total, limit } = await getTournaments(TOURNAMENT_PAGE_SIZE, offset, {
    query: search,
    status,
    visibility,
    date,
    timeZone: tz,
    club,
    country,
  });

  return (
    <>
      <WeekStrip />
      <main className="mx-auto flex w-full max-w-mobile flex-1 flex-col bg-background pb-5 font-manrope">
        {calendarView && <CalendarView />}

        <div className="flex items-center gap-2.5 px-5 pt-3.5 pb-2.5">
          <SearchForm
            action={basePath}
            label="Search tournaments"
            placeholder="Search tournaments and clubs"
            defaultValue={search}
          />
          <FilterSheet visibility={visibility} />
        </div>

        <ActiveFilterChips status={status} club={club} country={country} />

        <div className="flex items-center justify-between px-6 py-1.25">
          <h1 className="text-xl font-semibold text-obsidian">Tournaments</h1>
          <CalendarButton />
        </div>

        {data.length === 0 && (
          <p className="px-5 pt-2.5 text-sm text-neutral-secondary">
            {search
              ? `No tournaments match "${search}".`
              : "No tournaments found."}
          </p>
        )}

        <ul className="flex flex-col gap-5 px-5 pt-2.5">
          {data.map((tournament) => (
            <li key={tournament.id}>
              <TournamentCard tournament={tournament} />
            </li>
          ))}
        </ul>

        <div className="px-5 pt-5">
          <Pagination
            total={total}
            limit={limit}
            offset={offset}
            basePath={basePath}
            params={{
              q: search,
              status,
              club,
              country,
              date,
              tz: date ? tz : undefined,
              view: calendarView ? "calendar" : undefined,
            }}
          />
        </div>
      </main>
    </>
  );
}

export { TournamentBrowser };
