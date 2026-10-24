import { ExternalLink } from "lucide-react";

import { Card, CardHeader, CardTitle } from "@/components/primitives/card";
import { EventStatusChip } from "@/features/event/components/event-status-chip";
import type { TournamentEvent } from "@/features/event/types/event";
import { formatTimeLabel } from "@/lib/event-schedule";

type EventListCardProps = {
  title: string;
  events: TournamentEvent[];
  emptyMessage: string;
};

function EventListCard({ title, events, emptyMessage }: EventListCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle role="heading" aria-level={2} className="text-base">
          {title}
        </CardTitle>
      </CardHeader>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ul className="flex flex-col">
          {events.map((event) => (
            <li key={event.id}>
              {/* A button with no handler: the event detail page is a separate ticket. */}
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-3 py-2 text-left text-sm transition-colors hover:bg-muted"
              >
                <span className="w-16 shrink-0 text-muted-foreground tabular-nums">
                  {event.start_time ? formatTimeLabel(event.start_time) : "TBC"}
                </span>
                <span className="min-w-0 flex-1 truncate">{event.name}</span>
                <EventStatusChip status={event.status}>
                  <ExternalLink aria-hidden />
                </EventStatusChip>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export { EventListCard };
