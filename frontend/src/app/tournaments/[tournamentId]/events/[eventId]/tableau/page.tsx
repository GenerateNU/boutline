import { Background } from "@/components/primitives/background";
import { BackButton } from "@/components/primitives/back-button";
import { getEvents } from "@/features/event/services/getEvents";
import { getTableau } from "../_services/tableau";
import { TableauView } from "./_components/tableau-view";

interface TableauTabProps extends PageProps<"/tournaments/[tournamentId]/events/[eventId]/tableau"> {}

export default async function TableauTab({ params }: TableauTabProps) {
  const { tournamentId, eventId } = await params;
  const [tableau, events] = await Promise.all([
    getTableau(eventId),
    getEvents(tournamentId),
  ]);
  const eventName =
    events.find((event) => event.id === eventId)?.name ?? "Events";

  return (
    <div className="relative isolate -mx-4 h-[calc(100dvh-10.5rem)] overflow-clip bg-fencing-white px-4 pt-4">
      <Background version={7} />
      <div className="flex h-full flex-col">
        <BackButton
          href={`/tournaments/${tournamentId}/events`}
          className="-ml-3 mb-2 w-fit shrink-0 text-2xl text-[#1E1E1E]"
        >
          {eventName}
        </BackButton>
        <div className="min-h-0 flex-1">
          <TableauView
            tableau={tableau}
            boutBasePath={`/tournaments/${tournamentId}/events/${eventId}/bout`}
          />
        </div>
      </div>
    </div>
  );
}
