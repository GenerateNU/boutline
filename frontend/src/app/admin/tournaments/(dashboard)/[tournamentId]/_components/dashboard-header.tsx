import CalendarTodayOutlined from "@mui/icons-material/CalendarTodayOutlined";
import LocationOnOutlined from "@mui/icons-material/LocationOnOutlined";

import { BackButton } from "@/components/primitives/back-button";
import { TournamentStatusBadge } from "@/features/tournament/components/tournament-status-badge";
import type { Tournament } from "@/features/tournament/types/tournament";

interface DashboardHeaderProps {
  tournament: Tournament;
  dates: string | null;
}

export function DashboardHeader({ tournament, dates }: DashboardHeaderProps) {
  const location = [tournament.city, tournament.country].filter(Boolean).join(", ");

  return (
    <header className="mx-auto flex w-full max-w-mobile flex-col gap-2 px-4 pt-4 pb-6 font-manrope">
      <BackButton href="/admin/tournaments" className="self-start">
        All tournaments
      </BackButton>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-neutral-secondary">Tournament Management Dashboard</p>
        <TournamentStatusBadge status={tournament.status} admin />
      </div>
      <h1 className="text-xl font-semibold text-obsidian uppercase">{tournament.name}</h1>
      {(dates || location) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {dates && (
            <p className="flex items-center gap-1 text-xs text-neutral-secondary">
              <CalendarTodayOutlined className="size-4 shrink-0" aria-hidden />
              {dates}
            </p>
          )}
          {location && (
            <p className="flex items-center gap-1 text-xs text-neutral-secondary">
              <LocationOnOutlined className="size-4 shrink-0" aria-hidden />
              {location}
            </p>
          )}
        </div>
      )}
    </header>
  );
}
