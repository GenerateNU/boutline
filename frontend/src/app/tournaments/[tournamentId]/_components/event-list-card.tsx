import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/primitives/button";
import { Card, CardHeader, CardTitle } from "@/components/primitives/card";
import { Chip } from "@/components/primitives/chip";
import type { TournamentEvent } from "@/features/event/types/event";
import { eventStatusLabel, formatTimeLabel } from "@/lib/event-schedule";

interface EventListCardProps {
  title: string;
  events: TournamentEvent[];
  emptyMessage: string;
}

function EventListCard({ title, events, emptyMessage }: EventListCardProps) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle role="heading" aria-level={2} className="text-lg font-normal">
          {title}
        </CardTitle>
      </CardHeader>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ul className="flex flex-col">
          {events.map((event) => (
            <li key={event.id}>
              <Button
                asChild
                variant="text"
                className="h-auto w-full justify-start gap-3 px-0 py-2 font-normal"
              >
                <Link href={`/tournaments/${event.tournament_id}/events/${event.id}`}>
                  <p className="w-24 shrink-0 tabular-nums">
                    {event.start_time ? formatTimeLabel(event.start_time) : "TBC"}
                  </p>
                  <p className="min-w-0 flex-1 truncate">{event.name}</p>
                  <Chip className="bg-foreground text-xs text-background">
                    {eventStatusLabel[event.status]}
                    <ExternalLink aria-hidden />
                  </Chip>
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export { EventListCard };
