import { TabNav } from "@/components/primitives/tab-nav";

const TABS = [
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
    <>
      <TabNav
        label="Event sections"
        basePath={`/tournaments/${tournamentId}/events/${eventId}`}
        tabs={TABS}
      />
      <div className="mx-auto flex w-full max-w-mobile flex-col gap-10 px-4 pt-10 pb-20">
        {children}
      </div>
    </>
  );
}
