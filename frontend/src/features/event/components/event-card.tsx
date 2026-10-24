import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
} from "@/components/primitives/card";
import { Chip } from "@/components/primitives/chip";
import type {
  EventStatus,
  TournamentEvent,
} from "@/features/event/types/event";

const statusLabel: Record<EventStatus, string> = {
  upcoming: "Upcoming",
  active: "Live",
  ended: "Past",
};

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
            <Chip className="text-xs">{statusLabel[event.status]}</Chip>
          </CardAction>
        </CardHeader>
      </Card>
    </button>
  );
}

export { EventCard };
