"use client";

import { FencerCard } from "@/features/competitor/components/fencer-card";
import { usePinnedItems } from "@/features/pinning/hooks/use-pinned-items";
import { pinnedFirst } from "@/features/pinning/services/pinned-first";
import type { Competitor } from "@/types/competitor";

interface FencerListProps {
  competitors: Competitor[];
}

function FencerList({ competitors }: FencerListProps) {
  const { isPinned } = usePinnedItems();
  const ordered = pinnedFirst(
    competitors,
    (competitor) => isPinned("fencer", competitor.id),
    ({ firstName, lastName }) => `${firstName} ${lastName}`,
  );

  return (
    <ul className="flex flex-col gap-3">
      {ordered.map((competitor) => (
        <li key={competitor.id}>
          <FencerCard competitor={competitor} />
        </li>
      ))}
    </ul>
  );
}

export { FencerList };
