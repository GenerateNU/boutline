"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { FencerCard } from "@/features/competitor/components/fencer-card";
import { usePinnedItemsQuery } from "@/features/pinning/hooks/use-pinned-items-query";
import type { PinnedItems } from "@/features/pinning/types/pinning";
import type { Competitor } from "@/types/competitor";

// A fencer not entered in a tournament yet has no page to link to.
function fencerPage({ id, eventId, tournamentId }: Competitor) {
  if (!tournamentId) {
    return undefined;
  }
  return `/tournaments/${encodeURIComponent(tournamentId)}/events/${encodeURIComponent(eventId)}/fencers/${encodeURIComponent(id)}`;
}

interface PinnedSectionProps {
  title: string;
  children: React.ReactNode;
}

// The Figma's section headings are black and sentence case, unlike the shared
// Section's small gray caps.
function PinnedSection({ title, children }: PinnedSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-medium text-obsidian">{title}</h2>
      {children}
    </section>
  );
}

interface FencerSectionProps {
  items: PinnedItems;
  onUnpin: (id: string) => void;
}

function FencerSection({ items, onUnpin }: FencerSectionProps) {
  return (
    <PinnedSection title="Fencers">
      {items.fencers.length === 0 ? (
        <p className="text-sm text-neutral-secondary">No pinned fencers yet</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.fencers.map((fencer) => (
            <li key={fencer.id}>
              <FencerCard
                competitor={fencer}
                href={fencerPage(fencer)}
                pinned
                onTogglePin={() => onUnpin(fencer.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </PinnedSection>
  );
}

interface EmptySectionProps {
  title: string;
}

// Clubs and pools can't be pinned yet, so their sections only ever show this.
function EmptySection({ title }: EmptySectionProps) {
  return (
    <PinnedSection title={title}>
      <p className="text-sm text-neutral-secondary">{`No pinned ${title.toLowerCase()} yet`}</p>
    </PinnedSection>
  );
}

interface PinnedItemsViewProps {
  tournamentId?: string;
}

function PinnedItemsView({ tournamentId }: PinnedItemsViewProps) {
  const { items, error, unpinFencer } = usePinnedItemsQuery(tournamentId);

  if (error) {
    return (
      <p role="alert" className="text-sm text-red-dark">
        {error}
      </p>
    );
  }
  if (!items) {
    return <p className="text-sm text-neutral-secondary">Loading pins…</p>;
  }

  return (
    <Tabs defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="fencers">Fencers</TabsTrigger>
        <TabsTrigger value="clubs">Clubs</TabsTrigger>
        <TabsTrigger value="pools">Pools</TabsTrigger>
      </TabsList>
      <TabsContent value="all" className="flex flex-col gap-6 pt-4">
        <FencerSection items={items} onUnpin={unpinFencer} />
        <EmptySection title="Clubs" />
        <EmptySection title="Pools" />
      </TabsContent>
      <TabsContent value="fencers" className="pt-4">
        <FencerSection items={items} onUnpin={unpinFencer} />
      </TabsContent>
      <TabsContent value="clubs" className="pt-4">
        <EmptySection title="Clubs" />
      </TabsContent>
      <TabsContent value="pools" className="pt-4">
        <EmptySection title="Pools" />
      </TabsContent>
    </Tabs>
  );
}

export { PinnedItemsView };
