import { StatusBadge, type Status } from "@/components/primitives/status-badge";
import type { TournamentStatus } from "@/features/tournament/types/tournament";

const statusLabels: Record<TournamentStatus, string> = {
  pending: "Upcoming",
  active: "In Progress",
  ended: "Completed",
};

const badgeStatus: Record<TournamentStatus, Status> = {
  pending: "upcoming",
  active: "in-progress",
  ended: "completed",
};

interface TournamentStatusBadgeProps extends React.ComponentProps<"div"> {
  status: TournamentStatus;
}

function TournamentStatusBadge({ status, ...props }: TournamentStatusBadgeProps) {
  return <StatusBadge status={badgeStatus[status]} {...props} />;
}

export { TournamentStatusBadge, statusLabels };
