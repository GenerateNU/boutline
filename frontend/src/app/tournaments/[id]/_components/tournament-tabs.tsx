"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

// `segment` is the child directory under tournaments/[id]; null is the [id] page itself.
const tabs = [
  { label: "Overview", segment: null },
  { label: "Fencers", segment: "fencers" },
  { label: "Clubs", segment: "clubs" },
  { label: "Events", segment: "events" },
] as const;

type TournamentTabsProps = {
  id: string;
};

function TournamentTabs({ id }: TournamentTabsProps) {
  const activeSegment = useSelectedLayoutSegment();

  return (
    <nav
      aria-label="Tournament sections"
      className="flex overflow-hidden rounded-full border border-foreground"
    >
      {tabs.map(({ label, segment }) => (
        <Link
          key={label}
          href={segment ? `/tournaments/${id}/${segment}` : `/tournaments/${id}`}
          aria-current={segment === activeSegment ? "page" : undefined}
          className="flex-1 border-l border-foreground px-5 py-2 text-center text-sm whitespace-nowrap outline-none transition-colors first:border-l-0 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset aria-[current=page]:text-selected"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export { TournamentTabs };
