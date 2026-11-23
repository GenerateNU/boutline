"use client";

import { usePinnedItems } from "@/features/pinning/hooks/use-pinned-items";
import type { Pin } from "@/features/pinning/types/pinning";

interface PinnedFirstEntry {
  key: string;
  // What pinned entries are sorted by.
  label: string;
  pin: Pin;
  node: React.ReactNode;
}

interface PinnedFirstListProps {
  entries: PinnedFirstEntry[];
  className?: string;
  "aria-label"?: string;
}

// Pinned items lead, alphabetically by label with numbers compared as numbers ("Pool 2" before "Pool 10");
// the rest keep the order they came in, which is the list's chosen sort.
function pinnedFirst<T>(items: T[], isPinned: (item: T) => boolean, label: (item: T) => string): T[] {
  const pinned = items
    .filter(isPinned)
    .sort((a, b) => label(a).localeCompare(label(b), undefined, { sensitivity: "base", numeric: true }));
  return [...pinned, ...items.filter((item) => !isPinned(item))];
}

// Server pages can't hand a client component callbacks, so they pass each row
// already rendered along with what it pins; only the order is decided here.
function PinnedFirstList({ entries, className, "aria-label": ariaLabel }: PinnedFirstListProps) {
  const { isPinned } = usePinnedItems();
  // `as never`: TypeScript can't tie pin.kind to pin.item through the union, though Pin guarantees they match.
  const ordered = pinnedFirst(entries, ({ pin }) => isPinned(pin.kind, pin.item as never), ({ label }) => label);

  return (
    <ul aria-label={ariaLabel} className={className}>
      {ordered.map(({ key, node }) => (
        <li key={key}>{node}</li>
      ))}
    </ul>
  );
}

export { PinnedFirstList };
export type { PinnedFirstEntry };
