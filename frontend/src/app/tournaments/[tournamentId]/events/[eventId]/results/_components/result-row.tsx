"use client";

import { ChevronRight } from "lucide-react";
import { Dialog } from "radix-ui";

import { MockCountry } from "@/app/tournaments/[tournamentId]/_components/mock-country";
import { RatingBadge } from "@/components/primitives/rating-badge";
import type { PoolStanding } from "../../_types/results";
import { FencerPoolSheet } from "./fencer-pool-sheet";

interface ResultRowProps {
  standing: PoolStanding;
  fencerHref: string;
  place?: number;
}

function ResultRow({ standing, fencerHref, place }: ResultRowProps) {
  const { firstName, lastName, club, rating } = standing.fencer;

  return (
    <Dialog.Root>
      <Dialog.Trigger className="flex w-full cursor-pointer items-center gap-3 rounded-md border border-foreground px-3 py-2 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
        {place && <p className="w-6 shrink-0 font-mono text-sm">{place}</p>}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm uppercase">
            {firstName} {lastName}
          </p>
          <p className="truncate text-xs text-muted-foreground uppercase">
            <MockCountry /> - {club || "No club"}
          </p>
        </div>
        <RatingBadge tone="subtle">{rating}</RatingBadge>
        <ChevronRight aria-hidden className="size-4 shrink-0" />
      </Dialog.Trigger>
      <FencerPoolSheet standing={standing} fencerHref={fencerHref} />
    </Dialog.Root>
  );
}

export { ResultRow };
