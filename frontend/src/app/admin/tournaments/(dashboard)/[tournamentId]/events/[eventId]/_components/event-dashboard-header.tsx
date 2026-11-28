import GroupOutlined from "@mui/icons-material/GroupOutlined";
import ScheduleOutlined from "@mui/icons-material/ScheduleOutlined";

import { BackButton } from "@/components/primitives/back-button";
import { Text } from "@/components/primitives/text";
import { EventStatusBadge } from "@/features/event/components/event-status-badge";
import type { TournamentEvent } from "@/features/event/types/event";
import { formatTimeLabel } from "@/lib/event-schedule";
import { pluralize } from "@/lib/pluralize";

interface EventDashboardHeaderProps {
  event: TournamentEvent;
  competitorCount: number;
}

export function EventDashboardHeader({ event, competitorCount }: EventDashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-2 font-manrope">
      <BackButton href={`/admin/tournaments/${event.tournament_id}/events`} className="self-start">
        Events
      </BackButton>
      <div className="flex items-center justify-between gap-2">
        <Text variant="caption">Event Management Dashboard</Text>
        <EventStatusBadge status={event.status} />
      </div>
      <Text as="h1" variant="heading" className="uppercase">
        {event.name}
      </Text>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {event.start_time && (
          <Text variant="caption" className="flex items-center gap-1">
            <ScheduleOutlined className="size-3 shrink-0" aria-hidden />
            {formatTimeLabel(event.start_time)}
          </Text>
        )}
        <Text variant="caption" className="flex items-center gap-1">
          <GroupOutlined className="size-4 shrink-0" aria-hidden />
          {competitorCount} {pluralize(competitorCount, "competitor")}
        </Text>
      </div>
    </header>
  );
}
