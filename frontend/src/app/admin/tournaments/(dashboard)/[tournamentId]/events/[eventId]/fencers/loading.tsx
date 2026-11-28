"use client";

import { useParams, usePathname, useSearchParams } from "next/navigation";

import { Button } from "@/components/primitives/button";
import { ListCardSkeleton } from "@/components/primitives/list-card-skeleton";
import { SearchForm } from "@/features/tournament/components/search-form";

import { EventFencerFilterSheet } from "./_components/event-fencer-filter-sheet";

const ROW_COUNT = 6;

export default function AdminEventFencersLoading() {
  const pathname = usePathname();
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const search = useSearchParams().get("q") ?? "";

  return (
    <div className="flex flex-col gap-4">
      <p role="status" className="sr-only">
        Loading fencers
      </p>
      <div className="flex items-center gap-2.5">
        <SearchForm
          action={pathname}
          label="Search fencers"
          placeholder="Search fencers"
          defaultValue={search}
          suggest={{ tournamentId, sources: [{ kind: "fencers", href: pathname }] }}
        />
        <EventFencerFilterSheet tournamentId={tournamentId} />
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled>
          Add Fencers
        </Button>
        <Button size="sm" disabled>
          Edit Mode
        </Button>
      </div>
      <ul aria-hidden className="flex flex-col gap-3">
        {Array.from({ length: ROW_COUNT }, (_, index) => (
          <li key={index}>
            <ListCardSkeleton badge />
          </li>
        ))}
      </ul>
    </div>
  );
}
