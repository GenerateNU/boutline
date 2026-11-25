"use client";

import { useParams, usePathname } from "next/navigation";

import { NavigationBar } from "@/components/primitives/navigation/navigation-bar";

const TABS = [
  { label: "Pools", segment: "pools" },
  { label: "Fencers", segment: "fencers" },
  { label: "Results", segment: "results" },
  { label: "Settings", segment: "settings" },
];

// The light bar sits under the tournament's tabs; TabNav's dark row would move into the global navbar on desktop and collide with them.
export function EventTabNav() {
  const { tournamentId, eventId } = useParams<{ tournamentId: string; eventId: string }>();
  const pathname = usePathname();
  const basePath = `/admin/tournaments/${tournamentId}/events/${eventId}`;

  return (
    <NavigationBar
      aria-label="Event sections"
      surface="light"
      items={TABS.map(({ label, segment }) => {
        const href = `${basePath}/${segment}`;
        return {
          label,
          href,
          active: pathname === href || pathname.startsWith(`${href}/`),
          replace: true,
        };
      })}
    />
  );
}
