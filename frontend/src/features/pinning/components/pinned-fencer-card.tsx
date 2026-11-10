import { cn } from "cn";
import { Pin } from "lucide-react";
import Link from "next/link";

import { MockCountry } from "@/app/tournaments/[tournamentId]/_components/mock-country";
import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { RatingBadge } from "@/components/primitives/rating-badge";
import type { Competitor } from "@/types/competitor";

interface PinnedFencerCardProps {
  competitor: Competitor;
  onUnpin: () => void;
}

function PinnedFencerCard({ competitor, onUnpin }: PinnedFencerCardProps) {
  const { id, eventId, tournamentId, firstName, lastName, rating, ratingYear, team } = competitor;
  const name = `${firstName} ${lastName}`;
  const year = ratingYear === null ? "" : String(ratingYear).padStart(2, "0");
  // A fencer not entered in a tournament yet has no page to link to.
  const href =
    tournamentId &&
    `/tournaments/${encodeURIComponent(tournamentId)}/events/${encodeURIComponent(eventId)}/fencers/${encodeURIComponent(id)}`;

  const details = (
    <>
      <p className="truncate text-sm font-medium uppercase text-obsidian">{name}</p>
      <p className="truncate text-xs uppercase text-neutral-secondary">
        <MockCountry /> · {team || "No club"}
      </p>
    </>
  );

  return (
    <Card
      orientation="horizontal"
      className={cn(
        "relative gap-3 rounded-md border-blue-light bg-blue-lightest px-3 py-2",
        href && "transition-colors hover:bg-blue-lighter",
      )}
    >
      {href ? (
        // The link stretches over the whole card so all of it opens the fencer,
        // except the pin button, which sits above it.
        <Link
          href={href}
          className="min-w-0 flex-1 outline-none after:absolute after:inset-0 after:rounded-md focus-visible:after:ring-2 focus-visible:after:ring-ring"
        >
          {details}
        </Link>
      ) : (
        <div className="min-w-0 flex-1">{details}</div>
      )}
      <RatingBadge>
        {rating}
        {year}
      </RatingBadge>
      <Button
        type="button"
        variant="text"
        size="icon"
        aria-pressed
        aria-label={`Unpin ${name}`}
        onClick={onUnpin}
        className="relative z-10 size-8 text-blue"
      >
        <Pin aria-hidden />
      </Button>
    </Card>
  );
}

export { PinnedFencerCard };
