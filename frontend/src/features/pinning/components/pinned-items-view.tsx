"use client";

import { useMemo } from "react";

import { PoolCard } from "@/app/tournaments/[tournamentId]/events/[eventId]/pooling/_components/pool-card";
import { ListCard } from "@/components/primitives/list-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { ClubCard } from "@/features/competitor/components/club-card";
import { FencerCard } from "@/features/competitor/components/fencer-card";
import { FencerBoutList } from "@/features/pinning/components/fencer-bout-list";
import { PinnedItemsSkeleton } from "@/features/pinning/components/pinned-items-skeleton";
import { usePinnedFencers } from "@/features/pinning/hooks/use-pinned-fencers";
import { usePinnedItems } from "@/features/pinning/hooks/use-pinned-items";
import { usePinnedPools } from "@/features/pinning/hooks/use-pinned-pools";
import { pinnedInTournament } from "@/features/pinning/services/pinned-in-tournament";

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
      {isEmpty ? <p className="text-sm text-neutral-secondary">{empty}</p> : <ul className="flex flex-col gap-2">{children}</ul>}
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
        <li key={pool.id}>
          <PoolCard
            pool={pool}
            poolingPath={`/tournaments/${encodeURIComponent(pin.tournamentId)}/events/${encodeURIComponent(pin.eventId)}/pooling`}
            event={{ tournamentId: pin.tournamentId, eventId: pin.eventId, eventName: pin.eventName }}
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
