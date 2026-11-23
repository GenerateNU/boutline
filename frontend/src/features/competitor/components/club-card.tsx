"use client";

import { MockCountry } from "@/app/tournaments/[tournamentId]/_components/mock-country";
import { ListCard } from "@/components/primitives/list-card";
import { usePinnedItems } from "@/features/pinning/hooks/use-pinned-items";

interface ClubCardProps {
  name: string;
  tournamentId: string;
}

function ClubCard({ name, tournamentId }: ClubCardProps) {
  const { isPinned, togglePin } = usePinnedItems();
  const club = { tournamentId, name };

  return (
    <ListCard
      title={name}
      description={
        <>
          {/* Clubs have no stored location yet. */}
          <MockCountry /> &middot; Location TBC
        </>
      }
      href={`/tournaments/${encodeURIComponent(tournamentId)}/fencers?team=${encodeURIComponent(name)}`}
      pinned={isPinned("club", club)}
      onTogglePin={() => togglePin("club", club)}
    />
  );
}

export { ClubCard };
