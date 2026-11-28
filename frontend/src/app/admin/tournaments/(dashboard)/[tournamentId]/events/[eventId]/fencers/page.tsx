import Link from "next/link";

import { ActiveFilterChips } from "@/components/primitives/active-filter-chips";
import { Button } from "@/components/primitives/button";
import { Text } from "@/components/primitives/text";
import {
  FENCER_PAGE_SIZE,
  optionLabel,
  parseFencerFilters,
} from "@/features/competitor/lib/fencer-filters";
import { getCompetitors } from "@/features/competitor/services/getCompetitors";
import { SearchForm } from "@/features/tournament/components/search-form";
import { getTournamentRole } from "@/features/tournament/services/getTournamentRole";
import { readStringParam } from "@/lib/search-params";

import { AddFencerSheet } from "./_components/add-fencer-sheet";
import { EventFencerFilterSheet } from "./_components/event-fencer-filter-sheet";
import { EventFencerList } from "./_components/event-fencer-list";
import { CHECK_IN_OPTIONS, parseCheckInFilter } from "./_lib/check-in-filter";

export default async function AdminEventFencersTab({
  params,
  searchParams,
}: PageProps<"/admin/tournaments/[tournamentId]/events/[eventId]/fencers">) {
  const [{ tournamentId, eventId }, query] = await Promise.all([params, searchParams]);
  const role = await getTournamentRole(tournamentId);
  const canManage = role === "admin";
  const editing = canManage && readStringParam(query, "edit") === "1";

  const { search, team, rating } = parseFencerFilters(query);
  const checkedIn = parseCheckInFilter(readStringParam(query, "checkedIn"));
  const source = { tournamentId, eventId, query: search, team, rating, checkedIn };
  const { data, total, limit } = await getCompetitors(tournamentId, FENCER_PAGE_SIZE, 0, source);

  const basePath = `/admin/tournaments/${tournamentId}/events/${eventId}/fencers`;
  const toggleParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (key !== "edit" && typeof value === "string") {
      toggleParams.set(key, value);
    }
  }
  if (!editing) {
    toggleParams.set("edit", "1");
  }
  const toggleHref = toggleParams.size > 0 ? `${basePath}?${toggleParams}` : basePath;

  const activeFilters = [
    { param: "team", name: "Club", value: team },
    { param: "rating", name: "Rating", value: rating },
    { param: "checkedIn", name: "Check in", value: checkedIn && optionLabel(CHECK_IN_OPTIONS, checkedIn) },
  ];
  const hasFilters = Boolean(team || rating || checkedIn);

  return (
    <>
      <div className="flex items-center gap-2.5">
        <SearchForm
          action={basePath}
          label="Search fencers"
          placeholder="Search fencers"
          defaultValue={search}
          suggest={{ tournamentId, sources: [{ kind: "fencers", href: basePath }] }}
        />
        <EventFencerFilterSheet tournamentId={tournamentId} />
      </div>

      <ActiveFilterChips filters={activeFilters} />

      {canManage && (
        <div className="flex gap-3">
          {!editing && <AddFencerSheet eventId={eventId} />}
          <Button asChild size="sm">
            <Link href={toggleHref}>{editing ? "Exit Edit Mode" : "Edit Mode"}</Link>
          </Button>
        </div>
      )}

      {data.length > 0 ? (
        <EventFencerList
          competitors={data}
          total={total}
          pageSize={limit}
          query={source}
          editing={editing}
        />
      ) : (
        <Text variant="muted">
          {search
            ? `No fencers match “${search}”.`
            : hasFilters
              ? "No fencers match these filters."
              : "No fencers have entered this event yet."}
        </Text>
      )}
    </>
  );
}
