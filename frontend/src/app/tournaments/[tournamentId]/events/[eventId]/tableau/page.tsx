import { getTableau } from "../_services/tableau";
import { TableauView } from "./_components/tableau-view";

interface TableauTabProps
  extends PageProps<"/tournaments/[tournamentId]/events/[eventId]/tableau"> {}

export default async function TableauTab({ params }: TableauTabProps) {
  const { tournamentId, eventId } = await params;
  const tableau = await getTableau(eventId);

  return (
    <TableauView
      tableau={tableau}
      boutBasePath={`/tournaments/${tournamentId}/events/${eventId}/bout`}
    />
  );
}