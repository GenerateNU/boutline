import { Section } from "@/components/primitives/section";

import { BoutList } from "../_components/bout-list";
import { bouts } from "../_services/bouts";

interface TableauTabProps
  extends PageProps<"/tournaments/[tournamentId]/events/[eventId]/tableau"> {}

export default async function TableauTab({ params }: TableauTabProps) {
  const { tournamentId, eventId } = await params;

  return (
    <Section title="Tableau Tab" className="flex flex-col gap-4">
      <p>the direct elimination bracket for this event</p>
      <BoutList
        bouts={bouts.filter(({ stage }) => stage === "tableau")}
        eventPath={`/tournaments/${tournamentId}/events/${eventId}`}
      />
    </Section>
  );
}
