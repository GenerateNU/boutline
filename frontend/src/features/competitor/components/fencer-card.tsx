import { cn } from "cn";
import { Pin } from "lucide-react";
import Link from "next/link";

import { MockCountry } from "@/app/tournaments/[tournamentId]/_components/mock-country";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/primitives/card";
import { PinButton } from "@/components/primitives/pin-button";
import { RatingBadge } from "@/components/primitives/rating-badge";
import type { Competitor } from "@/types/competitor";

interface FencerCardProps {
  competitor: Competitor;
  pinned?: boolean;
  // Pinning from fencer rows comes in the dashboard tickets; until a page
  // passes this, the pin is there but does nothing.
  onTogglePin?: () => void;
}

function FencerCard({ competitor, pinned = false, onTogglePin }: FencerCardProps) {
  const { id, eventId, tournamentId, firstName, lastName, rating, ratingYear, team } = competitor;
  const name = `${firstName} ${lastName}`;
  const year = ratingYear === null ? "" : String(ratingYear).padStart(2, "0");
  // A fencer not entered in a tournament yet has no page to link to.
  const href =
    tournamentId &&
    `/tournaments/${encodeURIComponent(tournamentId)}/events/${encodeURIComponent(eventId)}/fencers/${encodeURIComponent(id)}`;

  const details = (
    <CardHeader className="gap-0.5">
      <CardTitle className="truncate text-sm font-medium uppercase text-obsidian">{name}</CardTitle>
      <CardDescription className="truncate text-xs uppercase text-neutral-secondary">
        <MockCountry /> · {team || "No club"}
      </CardDescription>
    </CardHeader>
  );

  return (
    <Card
      orientation="horizontal"
      className={cn(
        "relative gap-3 rounded-md px-3 py-2 transition-colors",
        pinned ? "border-blue-light bg-blue-lightest" : "border-outline bg-background",
        href && (pinned ? "hover:bg-blue-lighter" : "hover:bg-surface"),
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
      <RatingBadge tone={pinned ? "filled" : "subtle"}>
        {rating}
        {year}
      </RatingBadge>
      <PinButton
        variant="plain"
        size="xs"
        active={pinned}
        aria-label={`${pinned ? "Unpin" : "Pin"} ${name}`}
        onClick={onTogglePin}
        className="relative z-10"
      >
        <Pin aria-hidden />
      </PinButton>
    </Card>
  );
}

export { FencerCard };
