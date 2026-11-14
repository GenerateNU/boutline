import { Card } from "@/components/primitives/card";
import { Text } from "@/components/primitives/text";
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
      <Text as="h2" variant="title" className="px-3.5">
        {title}
      </Text>
      {events.length === 0 ? (
        <Text variant="muted" className="px-3.5">
          {emptyMessage}
        </Text>
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
