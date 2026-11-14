import { TabNav } from "@/components/primitives/tab-nav";
import { getSessionToken } from "@/features/auth/services/session";

const TABS = [
  { label: "Overview", segment: null },
  { label: "Fencers", segment: "fencers" },
  { label: "Referees", segment: "referees", signedInOnly: true },
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
  const tabs = TABS.filter(({ signedInOnly }) => sessionToken || !signedInOnly);

  return (
    <>
      <TabNav
        label="Tournament sections"
        basePath={`/tournaments/${tournamentId}`}
        tabs={tabs}
      />
      <div className="mx-auto flex w-full max-w-mobile flex-col gap-10 px-4 pt-10 pb-20">
        {children}
      </div>
    </>
  );
}
