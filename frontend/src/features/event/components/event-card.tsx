import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
} from "@/components/primitives/card";
import { EventStatusChip } from "@/features/event/components/event-status-chip";
import type { TournamentEvent } from "@/features/event/types/event";

type EventCardProps = {
  event: TournamentEvent;
};

// A button with no handler: the event detail page is a separate ticket, which
// will swap this for a Link.
function EventCard({ event }: EventCardProps) {
  return (
    <button type="button" className="w-full cursor-pointer text-left">
      <Card orientation="horizontal" className="transition-colors hover:bg-muted">
        <CardHeader>
          <CardTitle className="text-sm font-medium">{event.name}</CardTitle>
          <CardAction>
            <EventStatusChip status={event.status} />
          </CardAction>
        </CardHeader>
      </Card>
    </button>
  );
}

export { EventCard };
