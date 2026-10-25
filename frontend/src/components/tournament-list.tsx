import Link from "next/link";

import { Chip } from "@/components/primitives/chip";
import { statusLabels } from "@/features/tournament/components/tournament-status-badge";
import type { Tournament } from "@/features/tournament/types/tournament";

interface TournamentListProps {
  tournaments: Tournament[];
  emptyMessage?: string;
}

function TournamentList({
  tournaments,
  emptyMessage = "No tournaments yet.",
}: TournamentListProps) {
  if (tournaments.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {tournaments.map(({ id, name, status, start_time }) => (
        <li key={id}>
          <Link
            href={`/tournaments/${id}`}
            className="flex items-center justify-between gap-4 rounded-md border border-foreground px-4 py-3 transition-colors hover:bg-muted"
          >
            <span className="flex min-w-0 flex-col gap-1">
              <span className="truncate text-sm font-medium">{name}</span>
              <span className="text-xs text-muted-foreground">
                {start_time?.slice(0, 10) ?? "Date TBC"}
              </span>
            </span>
            <Chip className="shrink-0 rounded-full text-xs">
              {statusLabels[status]}
            </Chip>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export { TournamentList };
