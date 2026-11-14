import CalendarTodayOutlined from "@mui/icons-material/CalendarTodayOutlined";
import LocationOnOutlined from "@mui/icons-material/LocationOnOutlined";
import Link from "next/link";

import { Card, CardHeader, CardTitle } from "@/components/primitives/card";
import { TournamentStatusBadge } from "@/features/tournament/components/tournament-status-badge";
import { formatShortDate } from "@/features/tournament/lib/format-short-date";
import type { Tournament } from "@/features/tournament/types/tournament";

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
          {meta && (
            <p className="flex items-center gap-1 text-xs text-neutral-secondary">
              <Icon aria-hidden className="size-3.5 shrink-0" />
              {meta}
            </p>
          )}
        </CardHeader>
        <TournamentStatusBadge status={tournament.status} admin={admin} className="shrink-0" />
      </Card>
    </Link>
  );
}

export { TournamentCard };
