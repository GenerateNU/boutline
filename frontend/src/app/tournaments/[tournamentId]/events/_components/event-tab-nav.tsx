"use client";

import { useParams } from "next/navigation";

import { TabNav } from "@/components/primitives/tab-nav";

const TABS = [
  { label: "Pools", segment: "pooling" },
  { label: "Tableau", segment: "tableau" },
  { label: "Fencers", segment: "fencers" },
  { label: "Results", segment: "results" },
];

// Reads the ids from the URL so the loading screen, which receives no params, can render it too.
export function EventTabNav() {
  const { tournamentId, eventId } = useParams<{ tournamentId: string; eventId: string }>();

  return (
    <TabNav
      label="Event sections"
      basePath={`/tournaments/${tournamentId}/events/${eventId}`}
      tabs={TABS}
    />
  );
}
