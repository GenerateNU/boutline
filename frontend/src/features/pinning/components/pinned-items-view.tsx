"use client";

import { useMemo } from "react";

import { PoolCard } from "@/app/tournaments/[tournamentId]/events/[eventId]/pooling/_components/pool-card";
import { ListCard } from "@/components/primitives/list-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { Text } from "@/components/primitives/text";
import { ClubCard } from "@/features/competitor/components/club-card";
import { FencerCard } from "@/features/competitor/components/fencer-card";
import { PinnedItemsSkeleton } from "@/features/pinning/components/pinned-items-skeleton";
import { usePinnedFencers } from "@/features/pinning/hooks/use-pinned-fencers";
import { usePinnedItems } from "@/features/pinning/hooks/use-pinned-items";
import { usePinnedPools } from "@/features/pinning/hooks/use-pinned-pools";
import type { FencerBout } from "@/features/pinning/types/fencer-bout";
import type { PinnedItems } from "@/features/pinning/types/pinning";

const compare = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });

// Pins from every tournament share one store, so the page keeps only this tournament's.
function pinnedInTournament({ clubs, pools, tableaus }: PinnedItems, tournamentId?: string) {
  const inScope = <T extends { tournamentId: string }>(items: T[]) =>
    tournamentId ? items.filter((item) => item.tournamentId === tournamentId) : [...items];

  return {
    clubs: inScope(clubs).sort((a, b) => compare(a.name, b.name)),
    pools: inScope(pools).sort((a, b) => compare(a.eventName, b.eventName) || compare(a.title, b.title)),
    tableaus: inScope(tableaus).sort((a, b) => compare(a.eventName, b.eventName)),
  };
}

function resultLabel({ status, score }: FencerBout) {
  if (status === "upcoming" || !score) {
    return "Upcoming";
  }
  const result = `${score[0]}–${score[1]}`;
  return status === "active" ? `${result} · In Progress` : result;
}

interface FencerBoutListProps {
  bouts: FencerBout[];
}

function FencerBoutList({ bouts }: FencerBoutListProps) {
  if (bouts.length === 0) {
    return null;
  }
  return (
    <ul aria-label="Bouts" className="flex flex-col gap-1 pl-4">
      {bouts.map((bout) => (
        <li key={bout.id} className="flex items-center justify-between gap-4">
          <Text variant="caption">{`${bout.stage} · vs ${bout.opponent}`}</Text>
          <Text variant="caption">{resultLabel(bout)}</Text>
        </li>
      ))}
    </ul>
  );
}

interface PinnedSectionProps {
  title: string;
  empty: string;
  isEmpty: boolean;
  children: React.ReactNode;
}

// The Figma's section headings are black and sentence case, unlike the shared
// Section's small gray caps.
function PinnedSection({ title, empty, isEmpty, children }: PinnedSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-medium text-obsidian">{title}</h2>
      {isEmpty ? (
        <p className="text-sm text-neutral-secondary">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">{children}</ul>
      )}
    </section>
  );
}

interface PinnedItemsViewProps {
  tournamentId?: string;
}

function PinnedItemsView({ tournamentId }: PinnedItemsViewProps) {
  const { pinned, togglePin } = usePinnedItems();
  const scoped = useMemo(() => pinnedInTournament(pinned, tournamentId), [pinned, tournamentId]);
  const { fencers, bouts, error: fencersError } = usePinnedFencers(tournamentId);
  const { pools, error: poolsError } = usePinnedPools(scoped.pools);

  const error = fencersError ?? poolsError;
  if (error) {
    return (
      <p role="alert" className="text-sm text-red-dark">
        {error}
      </p>
    );
  }
  if (!fencers || !pools) {
    return <PinnedItemsSkeleton />;
  }

  const fencerSection = (
    <PinnedSection title="Fencers" empty="No pinned fencers yet" isEmpty={fencers.length === 0}>
      {fencers.map((fencer) => (
        <li key={fencer.id} className="flex flex-col gap-2">
          <FencerCard competitor={fencer} />
          <FencerBoutList bouts={bouts[fencer.id] ?? []} />
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
    <PinnedSection title="Pools" empty="No pinned pools yet" isEmpty={pools.length === 0}>
      {pools.map(({ pool, pin }) => (
        <li key={pool.id} className="flex flex-col gap-2">
          <Text variant="caption">{pin.eventName}</Text>
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
            title={tableau.eventName}
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
  );
}

export { PinnedItemsView };
