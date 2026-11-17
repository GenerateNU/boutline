"use client";

import { useParams } from "next/navigation";

import { TabNav } from "@/components/primitives/tab-nav";

const TABS = [
  { label: "Fencers", segment: null },
  { label: "Referees", segment: "referees" },
  { label: "Events", segment: "events" },
  { label: "Settings", segment: "settings" },
];

// Reads the id from the URL because the loading screen is rendered without route params.
export function DashboardTabNav() {
  const { tournamentId } = useParams<{ tournamentId: string }>();

  return (
    <TabNav
      label="Tournament management sections"
      basePath={`/admin/tournaments/${tournamentId}`}
      tabs={TABS}
    />
  );
}
