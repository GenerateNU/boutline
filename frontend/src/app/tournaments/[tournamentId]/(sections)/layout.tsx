import { TabNav } from "@/components/primitives/tab-nav";
import { getSessionToken } from "@/features/auth/services/session";

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
  const sessionToken = await getSessionToken();
  const tabs = sessionToken
    ? [...TABS.slice(0, 2), { label: "Referees", segment: "referees" }, ...TABS.slice(2)]
    : TABS;

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
