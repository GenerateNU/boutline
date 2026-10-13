import { Section } from "@/components/primitives/section";

import { BoutList } from "../_components/bout-list";
import { bouts } from "../_data/bouts";

export default async function PoolingTab({
  params,
}: PageProps<"/tournaments/[tournamentId]/events/[eventId]/pooling">) {
  const { tournamentId, eventId } = await params;

  return (
    <Section title="Pooling Tab" className="flex flex-col gap-4">
      <p>pool assignments and pool bout results for this event</p>
      <BoutList
        bouts={bouts.filter(({ stage }) => stage === "pool")}
        eventPath={`/tournaments/${tournamentId}/events/${eventId}`}
      />
    </Section>
  );
}
