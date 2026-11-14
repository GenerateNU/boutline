"use client";

import { cn } from "cn";

import { Chip } from "@/components/primitives/chip";
import { useTournamentFilters } from "@/features/tournament/hooks/use-tournament-filters";

export interface ActiveFilter {
  param: string;
  label: string;
}

interface ActiveFilterChipsProps {
  filters: ActiveFilter[];
  className?: string;
}

function ActiveFilterChips({ filters, className }: ActiveFilterChipsProps) {
  const { setFilters } = useTournamentFilters();

  if (filters.length === 0) {
    return null;
  }

  return (
    <ul aria-label="Active filters" className={cn("flex flex-wrap gap-2", className)}>
      {filters.map(({ param, label }) => (
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
