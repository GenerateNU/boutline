import { Calendar, MapPin } from "lucide-react";
import Link from "next/link";

import { TournamentStatusBadge } from "@/features/tournament/components/tournament-status-badge";
import type { Tournament } from "@/features/tournament/types/tournament";

interface TournamentCardProps {
  tournament: Tournament;
  subtitle?: string;
}

function TournamentCard({ tournament, subtitle }: TournamentCardProps) {
  const location = [tournament.city, tournament.country].filter(Boolean).join(", ");
  const meta = subtitle ? { Icon: Calendar, text: subtitle } : location && { Icon: MapPin, text: location };

  return (
    <Link
      href={`/tournaments/${tournament.id}`}
      className="flex items-start gap-3 rounded-[12px] border border-outline bg-background p-4 shadow-sm transition-colors hover:bg-blue-lightest"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate font-medium text-obsidian uppercase">
          {tournament.name}
        </p>
        {meta && (
          <p className="flex items-center gap-1 text-xs text-neutral-secondary">
            <meta.Icon aria-hidden className="size-3.5" />
            {meta.text}
          </p>
        )}
      </div>
      <TournamentStatusBadge status={tournament.status} className="shrink-0" />
    </Link>
  );
}

export { TournamentCard };
