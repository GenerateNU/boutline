import { Card, CardHeader, CardTitle } from "@/components/primitives/card";
import { Text, textVariants } from "@/components/primitives/text";
import { EventLink } from "@/features/event/components/event-link";
import { EventStatusBadge } from "@/features/event/components/event-status-badge";
import type { TournamentEvent } from "@/features/event/types/event";
import { pluralize } from "@/lib/pluralize";

interface EventCardProps {
  event: TournamentEvent;
  competitorCount: number;
}

function EventCard({ event, competitorCount }: EventCardProps) {
  return (
    <EventLink event={event} className="block rounded-[12px]">
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
    </EventLink>
  );
}

export { EventCard };
