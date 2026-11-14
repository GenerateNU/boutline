import { Card, CardTitle } from "@/components/primitives/card";
import type { TournamentEvent } from "@/features/event/types/event";

import { EventRow } from "./event-row";

interface EventListCardProps {
  title: string;
  events: TournamentEvent[];
  emptyMessage: string;
}

function EventListCard({ title, events, emptyMessage }: EventListCardProps) {
  return (
    <Card className="gap-1 rounded-lg px-1 py-3">
      <CardTitle role="heading" aria-level={2} className="px-3.5 text-xl text-obsidian">
        {title}
      </CardTitle>
      {events.length === 0 ? (
        <p className="px-3.5 text-sm text-neutral-secondary">{emptyMessage}</p>
      ) : (
        <ul>
          {events.map((event) => (
            <li key={event.id}>
              <EventRow event={event} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export { EventListCard };
