"use client";

import { useParams } from "next/navigation";

import { TabNav } from "@/components/primitives/tab-nav";

const TABS = [
  { label: "Overview", segment: null },
  { label: "Fencers", segment: "fencers" },
  { label: "Clubs", segment: "clubs" },
  { label: "Events", segment: "events" },
];

// Reads the id from the URL so the loading screen, which receives no params, can render it too.
export function TournamentTabNav() {
  const { tournamentId } = useParams<{ tournamentId: string }>();

  return <TabNav label="Tournament sections" basePath={`/tournaments/${tournamentId}`} tabs={TABS} />;
}
