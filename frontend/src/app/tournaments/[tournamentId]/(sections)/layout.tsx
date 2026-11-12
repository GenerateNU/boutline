import { TabNav } from "@/components/primitives/tab-nav";

const tabs = [
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
    <div className="flex flex-col gap-10">
      <TabNav
        label="Tournament sections"
        basePath={`/tournaments/${tournamentId}`}
        tabs={tabs}
      />
      {children}
    </div>
  );
}
