import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { Card, CardTitle } from "@/components/primitives/card";
import { StatusBadge, type Status } from "@/components/primitives/status-badge";
import type { EventStatus, TournamentEvent } from "@/features/event/types/event";
import { formatTimeLabel } from "@/lib/event-schedule";

const badgeStatus: Record<EventStatus, Status> = {
  upcoming: "not-started",
  active: "in-progress",
  ended: "completed",
};

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
            <li key={event.id} className="border-b border-outline">
              <Link
                href={`/tournaments/${event.tournament_id}/events/${event.id}`}
                className="flex items-center gap-3 py-3 pr-2 pl-4 transition-colors hover:bg-blue-lightest"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="text-xs font-medium text-neutral-secondary">
                    {event.start_time ? formatTimeLabel(event.start_time) : "TBC"}
                  </p>
                  <p className="truncate text-sm font-semibold text-obsidian uppercase">
                    {event.name}
                  </p>
                </div>
                <StatusBadge status={badgeStatus[event.status]} />
                <ChevronRight aria-hidden className="size-6 shrink-0 text-neutral-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export { EventListCard };
