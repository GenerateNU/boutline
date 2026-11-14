import { StatusBadge, type Status } from "@/components/primitives/status-badge";
import type { TournamentStatus } from "@/features/tournament/types/tournament";

const STATUS_LABELS: Record<TournamentStatus, string> = {
  pending: "Upcoming",
  active: "In Progress",
  ended: "Completed",
};

const BADGE_STATUS: Record<TournamentStatus, Status> = {
  pending: "upcoming",
  active: "in-progress",
  ended: "completed",
};

interface TournamentStatusBadgeProps extends React.ComponentProps<"div"> {
  status: TournamentStatus;
}

function TournamentStatusBadge({ status, ...props }: TournamentStatusBadgeProps) {
  return <StatusBadge status={BADGE_STATUS[status]} {...props} />;
}

export { TournamentStatusBadge, STATUS_LABELS as statusLabels };
