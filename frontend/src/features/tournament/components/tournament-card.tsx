import Link from "next/link";

import { TournamentStatusBadge } from "@/features/tournament/components/tournament-status-badge";
import type { Tournament } from "@/features/tournament/types/tournament";

function TournamentCard({ tournament }: { tournament: Tournament }) {
  return (
    <Link
      href={`/tournaments/${tournament.id}`}
      className="flex h-21 flex-col justify-center rounded-md border border-foreground px-4 transition-colors hover:bg-muted"
    >
      <p className="truncate leading-5 font-medium uppercase">{tournament.name}</p>
      <div className="flex items-center justify-between">
        <p className="text-xs leading-4">City, Country</p>
        <TournamentStatusBadge status={tournament.status} />
      </div>
    </Link>
  );
}

export { TournamentCard };
