import Link from "next/link";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/primitives/card";
import { EventStatusBadge } from "@/features/event/components/event-status-badge";
import type { TournamentEvent } from "@/features/event/types/event";
import { pluralize } from "@/lib/pluralize";

interface EventCardProps {
  event: TournamentEvent;
  competitorCount?: number;
}

function EventCard({ event, competitorCount }: EventCardProps) {
  return (
    <Link
      href={`/tournaments/${event.tournament_id}/events/${event.id}`}
      className="block rounded-[12px]"
    >
      <Card orientation="horizontal" className="gap-3 transition-colors hover:bg-blue-lightest">
        <CardHeader className="gap-0.5">
          <CardTitle className="text-base font-medium text-obsidian uppercase">
            {event.name}
          </CardTitle>
          {competitorCount !== undefined && (
            <CardDescription className="text-xs text-neutral-secondary">
              {pluralize(competitorCount, "competitor")}
            </CardDescription>
          )}
        </CardHeader>
        <EventStatusBadge status={event.status} />
      </Card>
    </Link>
  );
}

export { EventCard };
