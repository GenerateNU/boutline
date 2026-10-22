import { cn } from "cn";
import { format } from "date-fns";
import Link from "next/link";

import { getSessionToken } from "@/features/auth/services/session";
import { TopAppBar } from "@/features/navigation/components/top-app-bar";
import { CalendarView } from "@/features/tournament/components/calendar-view";
import { CreateTournamentCard } from "@/features/tournament/components/create-tournament-card";
import { FilterSheet } from "@/features/tournament/components/filter-sheet";
import { SearchForm } from "@/features/tournament/components/search-form";
import { TournamentCard } from "@/features/tournament/components/tournament-card";
import { statusLabels } from "@/features/tournament/components/tournament-status-badge";
import { WeekStrip } from "@/features/tournament/components/week-strip";
import { formatDateParam, parseDateParam } from "@/features/tournament/lib/date-param";
import { getTournaments } from "@/features/tournament/services/getTournaments";
import type { TournamentStatus } from "@/features/tournament/types/tournament";

const PAGE_SIZE = 20;

export default async function TournamentsPage({
  searchParams,
}: PageProps<"/tournaments">) {
  const query = await searchParams;
  const offset = Math.max(0, Number(query.offset) || 0);
  const status =
    typeof query.status === "string" && Object.hasOwn(statusLabels, query.status)
      ? (query.status as TournamentStatus)
      : undefined;
  const day = parseDateParam(typeof query.date === "string" ? query.date : undefined);
  const date = day && formatDateParam(day);
  const calendarView = query.view === "calendar";
  // Calendar view has no search bar, so a leftover q must not filter it.
  const search = !calendarView && typeof query.q === "string" ? query.q.trim() : "";

  const [{ data, total }, sessionToken] = await Promise.all([
    getTournaments(PAGE_SIZE, offset, search, status),
    getSessionToken(),
  ]);

  const tournaments = date
    ? data.filter((tournament) => tournament.start_time?.startsWith(date))
    : data;

  const hasPrev = offset > 0;
  const hasNext = offset + PAGE_SIZE < total;
  const pageHref = (pageOffset: number) => {
    const filters = {
      q: search,
      status,
      date,
      view: calendarView ? "calendar" : undefined,
      offset: String(pageOffset),
    };
    const params = Object.entries(filters).filter(
      (entry): entry is [string, string] => Boolean(entry[1]),
    );
    return `/tournaments?${new URLSearchParams(params)}`;
  };

  return (
    <>
      <TopAppBar signedIn={Boolean(sessionToken)} />
      <main className="mx-auto flex w-full max-w-mobile flex-col px-5 pb-5 font-satoshi">
        {calendarView ? (
          <>
            <div className="pt-6">
              <CalendarView />
            </div>
            <div className="flex items-end justify-between pt-2.5 pb-1.5">
              <div className="flex flex-col gap-2.5 pt-2.5">
                <h1 className="text-xl leading-6 font-medium">Tournaments</h1>
                {day && <p className="leading-5 font-medium">{format(day, "MMMM d, yyyy")}</p>}
              </div>
              <FilterSheet />
            </div>
          </>
        ) : (
          <>
            {sessionToken && (
              <div className="pt-5">
                <CreateTournamentCard />
              </div>
            )}
            <div className="flex items-center gap-2.5 pt-5">
              <SearchForm
                action="/tournaments"
                label="Search tournaments"
                defaultValue={search}
              />
              <FilterSheet />
            </div>
            <h1 className="pt-5 text-xl leading-6 font-medium uppercase">Tournaments</h1>
            <div className="pt-4">
              <WeekStrip />
            </div>
          </>
        )}

        {tournaments.length === 0 && (
          <p className="pt-2.5 text-sm text-muted-foreground">
            {search ? `No tournaments match "${search}".` : "No tournaments found."}
          </p>
        )}

        <ul className={cn("flex flex-col pt-2.5", calendarView ? "gap-2.5" : "gap-5")}>
          {tournaments.map((tournament) => (
            <li key={tournament.id}>
              <TournamentCard tournament={tournament} />
            </li>
          ))}
        </ul>

        <div className="flex justify-between pt-5">
          {hasPrev ? (
            <Link href={pageHref(Math.max(offset - PAGE_SIZE, 0))} className="underline">
              Previous
            </Link>
          ) : (
            <span className="opacity-40">Previous</span>
          )}
          {hasNext ? (
            <Link href={pageHref(offset + PAGE_SIZE)} className="underline">
              Next
            </Link>
          ) : (
            <span className="opacity-40">Next</span>
          )}
        </div>
      </main>
    </>
  );
}
