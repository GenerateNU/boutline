import { MapPin } from "lucide-react";
import Link from "next/link";

import { Card, CardHeader, CardTitle } from "@/components/primitives/card";
import { TournamentStatusBadge } from "@/features/tournament/components/tournament-status-badge";
import type { Tournament } from "@/features/tournament/types/tournament";

interface TournamentCardProps {
  tournament: Tournament;
}

function TournamentCard({ tournament }: TournamentCardProps) {
  const location = [tournament.city, tournament.country].filter(Boolean).join(", ");

  return (
    <Link href={`/tournaments/${tournament.id}`} className="block rounded-[12px]">
      <Card
        orientation="horizontal"
        className="items-start gap-3 transition-colors hover:bg-blue-lightest"
      >
        <CardHeader>
          <CardTitle className="text-base font-medium text-obsidian uppercase">
            {tournament.name}
          </CardTitle>
          {location && (
            <p className="flex items-center gap-1 text-xs text-neutral-secondary">
              <MapPin aria-hidden className="size-3.5 shrink-0" />
              {location}
            </p>
          )}
        </CardHeader>
        <TournamentStatusBadge status={tournament.status} />
      </Card>
    </Link>
  );
}

export { TournamentCard };
