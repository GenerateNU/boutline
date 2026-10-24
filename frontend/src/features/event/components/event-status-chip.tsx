import { cn } from "cn";

import { Chip } from "@/components/primitives/chip";
import type { EventStatus } from "@/features/event/types/event";

const statusLabel: Record<EventStatus, string> = {
  upcoming: "Upcoming",
  active: "Live",
  ended: "Past",
};

interface EventStatusChipProps extends React.ComponentProps<typeof Chip> {
  status: EventStatus;
}

function EventStatusChip({
  status,
  className,
  children,
  ...props
}: EventStatusChipProps) {
  return (
    <Chip className={cn("text-xs", className)} {...props}>
      {statusLabel[status]}
      {children}
    </Chip>
  );
}

export { EventStatusChip };
