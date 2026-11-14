import { notFound } from "next/navigation";

import { TabNav } from "@/components/primitives/tab-nav";
import { getEvents } from "@/features/event/services/getEvents";
import { getTournament } from "@/features/tournament/services/getTournament";
import { getTournamentRole } from "@/features/tournament/services/getTournamentRole";
import { formatEventDateRange } from "@/lib/event-schedule";

import { DashboardHeader } from "./_components/dashboard-header";

const TABS = [
  { label: "Fencers", segment: null },
  { label: "Referees", segment: "referees" },
  { label: "Events", segment: "events" },
  { label: "Settings", segment: "settings" },
];

export default async function TournamentDashboardLayout({
  children,
  params,
}: LayoutProps<"/admin/tournaments/[tournamentId]">) {
  const { tournamentId } = await params;
  const [tournament, role, events] = await Promise.all([
    getTournament(tournamentId),
    getTournamentRole(tournamentId),
    getEvents(tournamentId),
  ]);

  // Any staff role gets in; the backend still guards every write, so referees can look but not change.
  if (!tournament || role === null) {
    notFound();
  }

  return (
    <>
      <DashboardHeader
        tournament={tournament}
        dates={formatEventDateRange(events, tournament.start_time)}
      />
      <TabNav
        label="Tournament management sections"
        basePath={`/admin/tournaments/${tournamentId}`}
        tabs={TABS}
      />
      <div className="mx-auto flex w-full max-w-mobile flex-col gap-10 px-4 pt-10 pb-20">
        {children}
      </div>
    </>
  );
}
