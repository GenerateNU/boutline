import { cn } from "cn";

import type { TournamentStatus } from "@/features/tournament/types/tournament";

const statusLabels: Record<TournamentStatus, string> = {
  pending: "Upcoming",
  active: "In Progress",
  ended: "Completed",
};

interface TournamentStatusBadgeProps extends React.ComponentProps<"span"> {
  status: TournamentStatus;
}

function TournamentStatusBadge({
  status,
  className,
  ...props
}: TournamentStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-7 min-w-19 items-center justify-center rounded-sm bg-chip px-2 text-xs leading-5 text-foreground",
        className,
      )}
      {...props}
    >
      {statusLabels[status]}
    </span>
  );
}

export { TournamentStatusBadge, statusLabels };
