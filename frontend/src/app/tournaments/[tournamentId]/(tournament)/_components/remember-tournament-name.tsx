"use client";

import { useEffect } from "react";

import { rememberTournamentName } from "@/features/event/lib/remembered-names";

interface RememberTournamentNameProps {
  tournamentId: string;
  name: string;
}

// Lets the event loading screen draw the back link's tournament name.
function RememberTournamentName({ tournamentId, name }: RememberTournamentNameProps) {
  useEffect(() => {
    rememberTournamentName(tournamentId, name);
  }, [tournamentId, name]);

  return null;
}

export { RememberTournamentName };
