import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";

import { Card } from "@/components/primitives/card";
import { StatusBadge } from "@/components/primitives/status-badge";

import { ONGOING_EVENTS } from "../_services/ongoing-events";

export function OngoingEventsCard() {
  return (
    <Card className="gap-0 p-0 text-obsidian">
      <h2 className="px-4 pt-4 pb-3 text-lg font-medium">Ongoing Events</h2>
      <ul className="divide-y divide-outline border-t border-outline">
        {ONGOING_EVENTS.map((event) => (
          <li key={event.name} className="flex items-center gap-2.5 py-3.5 pr-3 pl-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-neutral-secondary">{event.time}</p>
              <p className="truncate text-sm font-semibold uppercase">{event.name}</p>
            </div>
            <StatusBadge status="in-progress" />
            <ChevronRightOutlined aria-hidden className="size-6 shrink-0 text-neutral-muted" />
          </li>
        ))}
      </ul>
    </Card>
  );
}
