import { notFound } from "next/navigation";

import { Background } from "@/components/primitives/background";
import { getEvent } from "@/features/event/services/getEvent";
import type { PinnedEvent } from "@/features/pinning/types/pinning";
import { getTableau } from "../_services/tableau";
import { TableauView } from "./_components/tableau-view";

interface TableauTabProps extends PageProps<"/tournaments/[tournamentId]/events/[eventId]/tableau"> {}

export default async function TableauTab({ params }: TableauTabProps) {
  const { tournamentId, eventId } = await params;
  const [tableau, event] = await Promise.all([getTableau(eventId), getEvent(eventId)]);
  if (!event) {
    notFound();
  }

  const pinnedEvent: PinnedEvent = { tournamentId, eventId, eventName: event.name };

  return (
    <div className="relative isolate -mx-4 h-[calc(100dvh-12.5rem)] overflow-clip bg-fencing-white px-4 pt-4">
      <Background version={7} />
      <div className="h-full">
        <TableauView
          tableau={tableau}
          event={pinnedEvent}
          boutBasePath={`/tournaments/${tournamentId}/events/${eventId}/bout`}
        />
      </div>
    </div>
  );
}
