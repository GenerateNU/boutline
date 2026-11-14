import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
import Link from "next/link";

import { Text } from "@/components/primitives/text";
import { EventStatusBadge } from "@/features/event/components/event-status-badge";
import type { TournamentEvent } from "@/features/event/types/event";
import { formatTimeLabel } from "@/lib/event-schedule";

interface EventRowProps {
  event: TournamentEvent;
}

function EventRow({ event }: EventRowProps) {
  return (
    <Link
      href={`/tournaments/${event.tournament_id}/events/${event.id}`}
      className="flex items-center gap-3 border-b border-outline py-3 pr-2 pl-4 transition-colors hover:bg-blue-lightest"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Text variant="caption">
          {event.start_time ? formatTimeLabel(event.start_time) : "TBC"}
        </Text>
        <Text variant="subtitle" className="truncate uppercase">
          {event.name}
        </Text>
      </div>
      <EventStatusBadge status={event.status} />
      <ChevronRightOutlined aria-hidden className="size-6 shrink-0 text-neutral-muted" />
    </Link>
  );
}

export { EventRow };
