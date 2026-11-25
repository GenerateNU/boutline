import GroupOutlined from "@mui/icons-material/GroupOutlined";
import ScheduleOutlined from "@mui/icons-material/ScheduleOutlined";

import { BackButton } from "@/components/primitives/back-button";
import { EventStatusBadge } from "@/features/event/components/event-status-badge";
import type { TournamentEvent } from "@/features/event/types/event";
import { formatTimeLabel } from "@/lib/event-schedule";
import { pluralize } from "@/lib/pluralize";

interface EventHeaderProps {
  event: TournamentEvent;
  competitorCount: number;
}

export function EventHeader({ event, competitorCount }: EventHeaderProps) {
  return (
    <header className="flex flex-col gap-2 pb-2.5 font-manrope">
      <BackButton
        href={`/admin/tournaments/${event.tournament_id}/events`}
        size="sm"
        className="self-start pl-0"
      >
        All events
      </BackButton>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-neutral-secondary">Event Management Dashboard</p>
        <EventStatusBadge status={event.status} />
      </div>
      <h1 className="text-xl font-semibold text-charcoal uppercase">{event.name}</h1>
      <div className="flex flex-wrap gap-x-4.5 gap-y-1">
        {event.start_time && (
          <p className="flex items-center gap-1 text-xs text-neutral-secondary">
            <ScheduleOutlined className="size-4 shrink-0" aria-hidden />
            {formatTimeLabel(event.start_time)}
          </p>
        )}
        <p className="flex items-center gap-1.5 text-xs text-neutral-secondary">
          <GroupOutlined className="size-4 shrink-0" aria-hidden />
          {competitorCount} {pluralize(competitorCount, "competitor")}
        </p>
      </div>
    </header>
  );
}
