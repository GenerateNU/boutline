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

// Organizers see a pending tournament as Scheduled; the public screens call it Upcoming.
const ADMIN_STATUS_LABELS: Record<TournamentStatus, string> = {
  ...STATUS_LABELS,
  pending: "Scheduled",
};

const ADMIN_BADGE_STATUS: Record<TournamentStatus, Status> = {
  ...BADGE_STATUS,
  pending: "scheduled",
};

interface TournamentStatusBadgeProps extends React.ComponentProps<"div"> {
  status: TournamentStatus;
  admin?: boolean;
}

function TournamentStatusBadge({ status, admin, ...props }: TournamentStatusBadgeProps) {
  const badgeStatus = admin ? ADMIN_BADGE_STATUS : BADGE_STATUS;
  return <StatusBadge status={badgeStatus[status]} {...props} />;
}

export {
  TournamentStatusBadge,
  STATUS_LABELS as statusLabels,
  ADMIN_STATUS_LABELS as adminStatusLabels,
};
