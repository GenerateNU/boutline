import { TabNav } from "@/components/primitives/tab-nav";

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
      <div className="mx-auto flex w-full max-w-mobile flex-col gap-10 px-4 pt-10 pb-20 font-manrope">
        {children}
      </div>
    </>
  );
}
