"use client";

import { Dialog } from "radix-ui";
import { useMemo, useState } from "react";

import { PoolCard } from "@/app/tournaments/[tournamentId]/events/[eventId]/pooling/_components/pool-card";
import { ListCard } from "@/components/primitives/list-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { Text } from "@/components/primitives/text";
import { ClubCard } from "@/features/competitor/components/club-card";
import { FencerCard } from "@/features/competitor/components/fencer-card";
import { PinnedFencerDialog } from "@/features/pinning/components/pinned-fencer-dialog";
import { PinnedItemsSkeleton } from "@/features/pinning/components/pinned-items-skeleton";
import { usePinnedFencers } from "@/features/pinning/hooks/use-pinned-fencers";
import { usePinnedItems } from "@/features/pinning/hooks/use-pinned-items";
import { type PinnedPoolEntry, usePinnedPools } from "@/features/pinning/hooks/use-pinned-pools";
import type { PinnedItems } from "@/features/pinning/types/pinning";
import type { Competitor } from "@/types/competitor";

const compare = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });

// Pins from every tournament share one store, so the page keeps only this tournament's.
function pinnedInTournament(
  { clubs, pools, tableaus }: PinnedItems,
  eventNames: Record<string, string>,
  tournamentId?: string,
) {
  const inScope = <T extends { tournamentId: string }>(items: T[]) =>
    tournamentId ? items.filter((item) => item.tournamentId === tournamentId) : [...items];

  return {
    clubs: inScope(clubs).sort((a, b) => compare(a.name, b.name)),
    pools: inScope(pools),
    tableaus: inScope(tableaus).sort((a, b) =>
      compare(eventNames[a.eventId] ?? "", eventNames[b.eventId] ?? ""),
    ),
  };
}

// Pools sort by event, then by number from the live pool ("Pool 2" before "Pool 10").
function sortPools(pools: PinnedPoolEntry[], eventNames: Record<string, string>) {
  return [...pools].sort(
    (a, b) =>
      compare(eventNames[a.pin.eventId] ?? "", eventNames[b.pin.eventId] ?? "") || a.pool.number - b.pool.number,
  );
}

interface PinnedSectionProps {
  title: string;
  empty: string;
  isEmpty: boolean;
  // A section whose request failed shows why, while the other sections stay usable.
  error?: string | null;
  children: React.ReactNode;
}

// The Figma's section headings are black and sentence case, unlike the shared
// Section's small gray caps.
function PinnedSection({ title, empty, isEmpty, error, children }: PinnedSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-medium text-obsidian">{title}</h2>
      {error ? (
        <p role="alert" className="text-sm text-red-dark">
          {error}
        </p>
      ) : isEmpty ? (
        <p className="text-sm text-neutral-secondary">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">{children}</ul>
      )}
    </section>
  );
}

interface PinnedItemsViewProps {
  tournamentId?: string;
  // Event id to name, for the tournament's events.
  eventNames: Record<string, string>;
}

function PinnedItemsView({ tournamentId, eventNames }: PinnedItemsViewProps) {
  const { pinned, togglePin } = usePinnedItems();
  const [selected, setSelected] = useState<Competitor | null>(null);
  const scoped = useMemo(
    () => pinnedInTournament(pinned, eventNames, tournamentId),
    [pinned, eventNames, tournamentId],
  );
  const { fencers, error: fencersError } = usePinnedFencers(tournamentId);
  const { pools, error: poolsError } = usePinnedPools(scoped.pools);

  // Wait until each request has either loaded or failed, so no section flashes its empty message.
  if ((!fencers && !fencersError) || (!pools && !poolsError)) {
    return <PinnedItemsSkeleton />;
  }

  const fencerSection = (
    <PinnedSection
      title="Fencers"
      empty="No pinned fencers yet"
      isEmpty={!fencers?.length}
      error={fencersError}
    >
      {fencers?.map((fencer) => (
        <li key={fencer.id}>
          <FencerCard competitor={fencer} onSelect={() => setSelected(fencer)} />
        </li>
      ))}
    </PinnedSection>
  );
  const clubSection = (
    <PinnedSection title="Clubs" empty="No pinned clubs yet" isEmpty={scoped.clubs.length === 0}>
      {scoped.clubs.map((club) => (
        <li key={`${club.tournamentId}/${club.name}`}>
          <ClubCard name={club.name} tournamentId={club.tournamentId} />
        </li>
      ))}
    </PinnedSection>
  );
  const poolSection = (
    <PinnedSection title="Pools" empty="No pinned pools yet" isEmpty={!pools?.length} error={poolsError}>
      {sortPools(pools ?? [], eventNames).map(({ pool, pin }) => (
        <li key={pool.id} className="flex flex-col gap-2">
          <Text variant="caption">{eventNames[pin.eventId]}</Text>
          <PoolCard
            pool={pool}
            poolingPath={`/tournaments/${encodeURIComponent(pin.tournamentId)}/events/${encodeURIComponent(pin.eventId)}/pooling`}
            event={pin}
          />
        </li>
      ))}
    </PinnedSection>
  );
  const tableauSection = (
    <PinnedSection title="Tableaus" empty="No pinned tableaus yet" isEmpty={scoped.tableaus.length === 0}>
      {scoped.tableaus.map((tableau) => (
        <li key={tableau.eventId}>
          <ListCard
            title={eventNames[tableau.eventId] ?? "Tableau"}
            description="Tableau"
            href={`/tournaments/${encodeURIComponent(tableau.tournamentId)}/events/${encodeURIComponent(tableau.eventId)}/tableau`}
            pinned
            onTogglePin={() => togglePin("tableau", tableau)}
          />
        </li>
      ))}
    </PinnedSection>
  );

  return (
    <>
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="fencers">Fencers</TabsTrigger>
          <TabsTrigger value="clubs">Clubs</TabsTrigger>
          <TabsTrigger value="pools">Pools</TabsTrigger>
          <TabsTrigger value="tableaus">Tableaus</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="flex flex-col gap-6 pt-4">
          {fencerSection}
          {clubSection}
          {poolSection}
          {tableauSection}
        </TabsContent>
        <TabsContent value="fencers" className="pt-4">
          {fencerSection}
        </TabsContent>
        <TabsContent value="clubs" className="pt-4">
          {clubSection}
        </TabsContent>
        <TabsContent value="pools" className="pt-4">
          {poolSection}
        </TabsContent>
        <TabsContent value="tableaus" className="pt-4">
          {tableauSection}
        </TabsContent>
      </Tabs>
      <Dialog.Root open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        {selected && <PinnedFencerDialog fencer={selected} />}
      </Dialog.Root>
    </>
  );
}

export { PinnedItemsView };
