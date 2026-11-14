import { Background } from "@/components/primitives/background";
import { getTableau } from "../_services/tableau";
import { TableauView } from "./_components/tableau-view";

interface TableauTabProps
  extends PageProps<"/tournaments/[tournamentId]/events/[eventId]/tableau"> {}

export default async function TableauTab({ params }: TableauTabProps) {
  const { tournamentId, eventId } = await params;
  const tableau = await getTableau(eventId);

  return (
    <div className="relative isolate -mx-4 min-h-218.5 overflow-clip bg-fencing-white px-4 py-4">
      <Background version={7} />
      <TableauView
        tableau={tableau}
        boutBasePath={`/tournaments/${tournamentId}/events/${eventId}/bout`}
      />
    </div>
  );
}