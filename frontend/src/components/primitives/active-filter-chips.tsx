"use client";

import { cn } from "cn";

import { Chip } from "@/components/primitives/chip";
import { useTournamentFilters } from "@/features/tournament/hooks/use-tournament-filters";

interface ActiveFilter {
  param: string;
  name: string;
  value?: string;
}

interface ActiveFilterChipsProps {
  filters: ActiveFilter[];
  className?: string;
}

function ActiveFilterChips({ filters, className }: ActiveFilterChipsProps) {
  const { setFilters } = useTournamentFilters();
  const active = filters.filter((filter) => filter.value);

  if (active.length === 0) {
    return null;
  }

  return (
    <ul aria-label="Active filters" className={cn("flex flex-wrap gap-2", className)}>
      {active.map(({ param, name, value }) => (
        <li key={param}>
          <Chip
            onDismiss={() => setFilters({ [param]: undefined })}
            dismissLabel={`Remove ${name}: ${value}`}
          >
            {name}: {value}
          </Chip>
        </li>
      ))}
    </ul>
  );
}

export { ActiveFilterChips };
