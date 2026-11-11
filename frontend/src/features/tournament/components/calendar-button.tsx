"use client";

import { Calendar } from "lucide-react";

import { Button } from "@/components/primitives/button";
import { useTournamentFilters } from "@/features/tournament/hooks/use-tournament-filters";

function CalendarButton() {
  const { searchParams, setFilters } = useTournamentFilters();
  const open = searchParams.get("view") === "calendar";

  return (
    <Button
      type="button"
      variant="text"
      size="icon"
      aria-label="Calendar"
      aria-pressed={open}
      onClick={() => setFilters({ view: open ? undefined : "calendar" })}
      className="-m-2 text-obsidian aria-pressed:bg-blue-lighter [&_svg]:size-6"
    >
      <Calendar />
    </Button>
  );
}

export { CalendarButton };
