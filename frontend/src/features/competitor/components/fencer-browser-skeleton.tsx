"use client";

import { useParams, usePathname, useSearchParams } from "next/navigation";

import { ListCardSkeleton } from "@/components/primitives/list-card-skeleton";
import { FencerFilterSheet } from "@/features/competitor/components/fencer-filter-sheet";
import { SearchForm } from "@/features/tournament/components/search-form";

const ROW_COUNT = 6;

// Shared by the tournament and event Fencers tabs, so the form posts to the
// current path and reads the tournament id from the URL.
function FencerBrowserSkeleton() {
  const pathname = usePathname();
  const { tournamentId, eventId } = useParams<{ tournamentId: string; eventId?: string }>();
  const search = useSearchParams().get("q") ?? "";

  return (
    <>
      <div className="flex items-center gap-2.5">
        <SearchForm
          action={pathname}
          label="Search fencers"
          placeholder="Search fencers"
          defaultValue={search}
          suggest={{ tournamentId, sources: [{ kind: "fencers", href: pathname }] }}
        />
        <FencerFilterSheet tournamentId={tournamentId} scope={eventId ? "event" : "tournament"} />
      </div>

      <ul aria-hidden className="flex flex-col gap-3">
        {Array.from({ length: ROW_COUNT }, (_, index) => (
          <li key={index}>
            <ListCardSkeleton badge />
          </li>
        ))}
      </ul>
    </>
  );
}

export { FencerBrowserSkeleton };
