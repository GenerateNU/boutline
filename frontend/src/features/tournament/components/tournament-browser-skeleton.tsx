"use client";

import { useSearchParams } from "next/navigation";

import { ActiveFilterChips } from "@/components/primitives/active-filter-chips";
import { CalendarButton } from "@/features/tournament/components/calendar-button";
import { FilterSheet } from "@/features/tournament/components/filter-sheet";
import { SearchForm } from "@/features/tournament/components/search-form";
import { TournamentCardSkeleton } from "@/features/tournament/components/tournament-card-skeleton";
import { statusLabels } from "@/features/tournament/components/tournament-status-badge";
import { countryName } from "@/features/tournament/lib/country-name";
import { parseTournamentFilters } from "@/features/tournament/lib/tournament-filters";

const CARD_COUNT = 5;

// Mirrors TournamentBrowser's layout so the page doesn't jump when results arrive.
// The date strip isn't drawn here: the page renders the real one above this.
function TournamentBrowserSkeleton() {
  const searchParams = useSearchParams();
  const { status, search, club, country } = parseTournamentFilters(
    Object.fromEntries(searchParams),
  );
  const activeFilters = [
    { param: "status", name: "Status", value: status && statusLabels[status] },
    { param: "club", name: "Club", value: club },
    { param: "country", name: "Country", value: country && countryName(country) },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <span role="status" className="sr-only">
        Loading tournaments
      </span>
      <div className="mx-auto flex w-full max-w-mobile flex-1 flex-col bg-background pb-5 font-manrope">
        <div className="flex items-center gap-2.5 px-5 pt-3.5 pb-2.5">
          <SearchForm
            action="/tournaments"
            label="Search tournaments"
            placeholder="Search tournaments and clubs"
            defaultValue={search}
          />
          <FilterSheet visibility="public" />
        </div>

        <ActiveFilterChips className="px-5 pb-2.5" filters={activeFilters} />

        <div className="flex items-center justify-between px-6 py-1.25">
          <h1 className="text-xl font-semibold text-obsidian">Tournaments</h1>
          <CalendarButton submitLabel="Show Tournaments" />
        </div>

        <ul aria-hidden className="flex flex-col gap-5 px-5 pt-2.5">
          {Array.from({ length: CARD_COUNT }, (_, index) => (
            <li key={index}>
              <TournamentCardSkeleton />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export { TournamentBrowserSkeleton };
