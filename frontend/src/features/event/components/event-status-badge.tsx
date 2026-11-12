import { StatusBadge, type Status } from "@/components/primitives/status-badge";
import type { EventStatus } from "@/features/event/types/event";

const badgeStatus: Record<EventStatus, Status> = {
  upcoming: "not-started",
  active: "in-progress",
  ended: "completed",
};

interface EventStatusBadgeProps extends React.ComponentProps<"div"> {
  status: EventStatus;
}

function EventStatusBadge({ status, ...props }: EventStatusBadgeProps) {
  return <StatusBadge status={badgeStatus[status]} {...props} />;
}

export { EventStatusBadge };
