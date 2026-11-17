import { Suspense } from "react";

import { BackButton } from "@/components/primitives/back-button";
import { Skeleton } from "@/components/primitives/skeleton";
import { TabNav } from "@/components/primitives/tab-nav";

import { TournamentHeading } from "./_components/tournament-heading";

const TABS = [
  { label: "Overview", segment: null },
  { label: "Fencers", segment: "fencers" },
  { label: "Clubs", segment: "clubs" },
  { label: "Events", segment: "events" },
];

// A route group, so the tournament tabs skip event pages, which carry their own tab bar.
export default async function TournamentSectionsLayout({
  children,
  params,
}: LayoutProps<"/tournaments/[tournamentId]">) {
  const { tournamentId } = await params;

  return (
    <>
      <TabNav
        label="Tournament sections"
        basePath={`/tournaments/${tournamentId}`}
        tabs={TABS}
      />
      <div className="mx-auto flex w-full max-w-mobile flex-col gap-4 px-4 pt-4 pb-20 font-manrope">
        <BackButton href="/tournaments" className="self-start">
          All tournaments
        </BackButton>
        {/* Drawn here rather than by each tab, so switching tabs keeps the name instead of shimmering it. */}
        <Suspense fallback={<Skeleton className="h-7 w-2/3" />}>
          <TournamentHeading tournamentId={tournamentId} />
        </Suspense>
        {children}
      </div>
    </>
  );
}
