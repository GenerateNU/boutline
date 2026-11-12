"use client";

import { Chip } from "@/components/primitives/chip";
import { statusLabels } from "@/features/tournament/components/tournament-status-badge";
import { useTournamentFilters } from "@/features/tournament/hooks/use-tournament-filters";
import { countryName } from "@/features/tournament/lib/country-name";
import type { TournamentStatus } from "@/features/tournament/types/tournament";

interface ActiveFilterChipsProps {
  status?: TournamentStatus;
  club?: string;
  country?: string;
}

function ActiveFilterChips({ status, club, country }: ActiveFilterChipsProps) {
  const { setFilters } = useTournamentFilters();
  const chips = [
    { param: "status", label: status && statusLabels[status] },
    { param: "club", label: club },
    { param: "country", label: country && countryName(country) },
  ].filter((chip) => chip.label);

  if (chips.length === 0) {
    return null;
  }

  return (
    <ul aria-label="Active filters" className="flex flex-wrap gap-2 px-5 pb-2.5">
      {chips.map(({ param, label }) => (
        <li key={param}>
          <Chip
            onDismiss={() => setFilters({ [param]: undefined })}
            dismissLabel={`Remove ${label}`}
            className="rounded-full border-blue bg-blue-lighter py-1 text-xs font-medium text-blue"
          >
            {label}
          </Chip>
        </li>
      ))}
    </ul>
  );
}

export { ActiveFilterChips };
