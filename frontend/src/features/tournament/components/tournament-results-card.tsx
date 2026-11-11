import { Calendar, MapPin } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/primitives/button";
import { Card, CardHeader, CardTitle } from "@/components/primitives/card";
import { TournamentStatusBadge } from "@/features/tournament/components/tournament-status-badge";
import { formatShortDate } from "@/features/tournament/lib/format-short-date";
import type { Tournament } from "@/features/tournament/types/tournament";
import { pluralize } from "@/lib/pluralize";

interface TournamentResultsCardProps {
  tournament: Tournament;
  eventCount: number;
  resultsHref: string;
}

function TournamentResultsCard({ tournament, eventCount, resultsHref }: TournamentResultsCardProps) {
  const date = tournament.start_time && formatShortDate(tournament.start_time);
  const location = [tournament.city, tournament.country].filter(Boolean).join(", ");

  return (
    <Card className="gap-3">
      <div className="flex items-start gap-3">
        <CardHeader>
          <CardTitle className="text-xl whitespace-normal text-obsidian uppercase">
            {tournament.name}
          </CardTitle>
          <p className="flex items-center gap-1 text-xs text-neutral-secondary">
            <Calendar aria-hidden className="size-3.5 shrink-0" />
            {date && <>{date} &middot; </>}
            {eventCount} {pluralize(eventCount, "event")}
          </p>
          {location && (
            <p className="flex items-center gap-1 text-xs text-neutral-secondary">
              <MapPin aria-hidden className="size-3.5 shrink-0" />
              {location}
            </p>
          )}
        </CardHeader>
        <TournamentStatusBadge status={tournament.status} />
      </div>
      <Button asChild>
        <Link href={resultsHref}>View Results</Link>
      </Button>
    </Card>
  );
}

export { TournamentResultsCard };
