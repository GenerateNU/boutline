import Link from "next/link";

import { Card, CardHeader, CardTitle } from "@/components/primitives/card";
import { Text, textVariants } from "@/components/primitives/text";
import { EventStatusBadge } from "@/features/event/components/event-status-badge";
import type { TournamentEvent } from "@/features/event/types/event";
import { pluralize } from "@/lib/pluralize";

interface EventCardProps {
  event: TournamentEvent;
  competitorCount: number;
  // Defaults to the public event page; the admin dashboard links to its own.
  href?: string;
}

function EventCard({
  event,
  competitorCount,
  href = `/tournaments/${event.tournament_id}/events/${event.id}`,
}: EventCardProps) {
  return (
    <Link href={href} className="block rounded-[12px]">
      <Card orientation="horizontal" className="gap-3 transition-colors hover:bg-blue-lightest">
        <CardHeader>
          <CardTitle className={textVariants({ variant: "subtitle", className: "uppercase" })}>
            {event.name}
          </CardTitle>
          <Text variant="caption">
            {competitorCount} {pluralize(competitorCount, "competitor")}
          </Text>
        </CardHeader>
        <EventStatusBadge status={event.status} />
      </Card>
    </Link>
  );
}

export { EventCard };
