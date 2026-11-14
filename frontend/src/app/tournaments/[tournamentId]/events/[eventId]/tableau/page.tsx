import { Background } from "@/components/primitives/background";
import { getTableau } from "../_services/tableau";
import { TableauView } from "./_components/tableau-view";

interface TableauTabProps extends PageProps<"/tournaments/[tournamentId]/events/[eventId]/tableau"> {}

export default async function TableauTab({ params }: TableauTabProps) {
  const { tournamentId, eventId } = await params;
  const tableau = await getTableau(eventId);

  return (
    <div className="relative isolate -mx-4 h-[calc(100dvh-10.5rem)] overflow-clip bg-fencing-white px-4 pt-4">
      <Background version={7} />
      <TableauView
        tableau={tableau}
        boutBasePath={`/tournaments/${tournamentId}/events/${eventId}/bout`}
      />
    </div>
  );
}
