import { TabNav } from "@/components/primitives/tab-nav";

const tabs = [
  { label: "Pooling", segment: "pooling" },
  { label: "Fencers", segment: "fencers" },
  { label: "Tableau", segment: "tableau" },
  { label: "Results", segment: "results" },
];

export default async function EventLayout({
  children,
  params,
}: LayoutProps<"/tournaments/[tournamentId]/events/[eventId]">) {
  const { tournamentId, eventId } = await params;

  return (
    <div className="flex flex-col gap-10">
      <TabNav
        label="Event sections"
        basePath={`/tournaments/${tournamentId}/events/${eventId}`}
        tabs={tabs}
      />
      {children}
    </div>
  );
}
