"use client";

import { ClubCard } from "@/features/competitor/components/club-card";
import { usePinnedItems } from "@/features/pinning/hooks/use-pinned-items";
import { pinnedFirst } from "@/features/pinning/services/pinned-first";

interface ClubListProps {
  names: string[];
  tournamentId: string;
}

function ClubList({ names, tournamentId }: ClubListProps) {
  const { isPinned } = usePinnedItems();
  const ordered = pinnedFirst(names, (name) => isPinned("club", { tournamentId, name }), (name) => name);

  return (
    <ul className="flex flex-col gap-3">
      {ordered.map((name) => (
        <li key={name}>
          <ClubCard name={name} tournamentId={tournamentId} />
        </li>
      ))}
    </ul>
  );
}

export { ClubList };
