"use client";

import { useParams, usePathname, useSearchParams } from "next/navigation";

import { ListCardSkeleton } from "@/components/primitives/list-card-skeleton";
import { ClubFilterSheet } from "@/features/competitor/components/club-filter-sheet";
import { SearchForm } from "@/features/tournament/components/search-form";

const ROW_COUNT = 6;

export default function ClubsLoading() {
  const pathname = usePathname();
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const search = useSearchParams().get("q") ?? "";

  return (
    <div className="flex flex-col gap-4">
      <span role="status" className="sr-only">
        Loading clubs
      </span>

      <div className="flex items-center gap-2.5">
        <SearchForm
          action={pathname}
          label="Search clubs"
          placeholder="Search clubs"
          defaultValue={search}
          suggest={{
            tournamentId,
            sources: [
              { kind: "fencers", href: `/tournaments/${tournamentId}/fencers` },
              { kind: "clubs", href: pathname },
            ],
          }}
        />
        <ClubFilterSheet />
      </div>

      <ul aria-hidden className="flex flex-col gap-3">
        {Array.from({ length: ROW_COUNT }, (_, index) => (
          <li key={index}>
            <ListCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}
