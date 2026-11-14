import { PinButton } from "@/components/primitives/pin-button";
import { Section } from "@/components/primitives/section";

import { BoutList } from "../_components/bout-list";
import { BOUTS } from "../_services/bouts";

interface PoolingTabProps
  extends PageProps<"/tournaments/[tournamentId]/events/[eventId]/pooling"> {}

const POOL_BOUTS = BOUTS.filter(({ stage }) => stage === "pool");
// A pool bout's round is its pool's name, e.g. "Pool 1".
const POOLS = [...new Set(POOL_BOUTS.map(({ round }) => round))];

export default async function PoolingTab({ params }: PoolingTabProps) {
  const { tournamentId, eventId } = await params;

  return (
    <Section title="Pooling Tab" className="flex flex-col gap-4">
      <p>pool assignments and pool bout results for this event</p>
      {POOLS.map((pool) => (
        <section key={pool} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-obsidian">{pool}</h3>
            {/* Pinning pools comes in the dashboard tickets; for now the pin does nothing. */}
            <PinButton variant="plain" size="xs" active={false} aria-label={`Pin ${pool}`} />
          </div>
          <BoutList
            bouts={POOL_BOUTS.filter(({ round }) => round === pool)}
            eventPath={`/tournaments/${tournamentId}/events/${eventId}`}
          />
        </section>
      ))}
    </Section>
  );
}
