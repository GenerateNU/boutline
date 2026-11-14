import CalendarTodayOutlined from "@mui/icons-material/CalendarTodayOutlined";
import LocationOnOutlined from "@mui/icons-material/LocationOnOutlined";
import Link from "next/link";

import { Card, CardHeader, CardTitle } from "@/components/primitives/card";
import { TournamentStatusBadge } from "@/features/tournament/components/tournament-status-badge";
import { formatShortDate } from "@/features/tournament/lib/format-short-date";
import type { Tournament, TournamentRole } from "@/features/tournament/types/tournament";

const ROLE_LABELS: Record<TournamentRole, string> = {
  admin: "Admin",
  referee: "Referee",
};

interface TournamentCardProps {
  tournament: Tournament;
  admin?: boolean;
}

function TournamentCard({ tournament, admin }: TournamentCardProps) {
  const location = [tournament.city, tournament.country].filter(Boolean).join(", ");
  const Icon = admin ? CalendarTodayOutlined : LocationOnOutlined;
  const meta = admin ? `Created ${formatShortDate(tournament.created_at)}` : location;

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
          {(meta || tournament.role) && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-secondary">
              {meta && (
                <span className="inline-flex items-center gap-1">
                  <Icon aria-hidden className="size-3.5 shrink-0" />
                  {meta}
                </span>
              )}
              {meta && tournament.role && <span aria-hidden className="h-3 w-px bg-outline" />}
              {tournament.role && (
                <span className="font-medium text-obsidian">{ROLE_LABELS[tournament.role]}</span>
              )}
            </p>
          )}
        </CardHeader>
        <TournamentStatusBadge status={tournament.status} admin={admin} className="shrink-0" />
      </Card>
    </Link>
  );
}

export { TournamentCard };
