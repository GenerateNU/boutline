import { cva } from "class-variance-authority";
import { cn } from "cn";

import type { TournamentStatus } from "@/features/tournament/types/tournament";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      status: {
        pending: "bg-amber-600 text-white",
        active: "bg-emerald-600 text-white",
        ended: "bg-muted text-muted-foreground",
      },
    },
  },
);

const statusLabels: Record<TournamentStatus, string> = {
  pending: "Upcoming",
  active: "Active",
  ended: "Ended",
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
    <span className={cn(badgeVariants({ status }), className)} {...props}>
      {statusLabels[status]}
    </span>
  );
}

export { TournamentStatusBadge };
