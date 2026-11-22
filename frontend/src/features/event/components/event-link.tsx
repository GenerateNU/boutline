"use client";

import Link from "next/link";

import { TournamentEvent } from "@/features/event/types/event";
import { rememberEventName } from "@/features/event/lib/remembered-names";

interface EventLinkProps extends Omit<React.ComponentProps<typeof Link>, "href" | "onNavigate"> {
  event: TournamentEvent;
}

function EventLink({ event, ...props }: EventLinkProps) {
  return (
    <Link
      // Straight to the first tab, so the loading screen already knows which tab it is laying out.
      href={`/tournaments/${event.tournament_id}/events/${event.id}/pooling`}
      onNavigate={() => rememberEventName(event.id, event.name)}
      {...props}
    />
  );
}

export { EventLink };
