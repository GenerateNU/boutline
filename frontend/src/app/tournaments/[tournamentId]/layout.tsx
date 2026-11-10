import { PinsLinkButton } from "@/app/tournaments/[tournamentId]/_components/pins-link-button";
import { TabNav } from "@/components/primitives/tab-nav";

const tabs = [
  { label: "Overview", segment: null },
  { label: "Fencers", segment: "fencers" },
  { label: "Clubs", segment: "clubs" },
  { label: "Events", segment: "events" },
];

export default async function TournamentLayout({
  children,
  params,
}: LayoutProps<"/tournaments/[tournamentId]">) {
  const { tournamentId } = await params;

  return (
    <div className="mx-auto flex w-full max-w-mobile flex-col gap-10 px-4 pt-10 pb-20">
      <TabNav
        label="Tournament sections"
        basePath={`/tournaments/${tournamentId}`}
        tabs={tabs}
      />
      {children}
      <PinsLinkButton tournamentId={tournamentId} />
    </div>
  );
}
