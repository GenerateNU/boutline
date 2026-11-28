"use client";

import { cn } from "cn";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

const TABS = [
  { label: "Pools", segment: null },
  { label: "Fencers", segment: "fencers" },
  { label: "Results", segment: "results" },
  { label: "Settings", segment: "settings" },
];

// The light, in-page tab row from the event dashboard design, rather than TabNav's obsidian
// row under the global nav. Reads the ids from the URL so the loading screen can draw it too.
export function EventDashboardTabNav() {
  const { tournamentId, eventId } = useParams<{ tournamentId: string; eventId: string }>();
  const pathname = usePathname();
  const basePath = `/admin/tournaments/${tournamentId}/events/${eventId}`;

  return (
    <nav aria-label="Event sections" className="flex border-b border-outline font-manrope">
      {TABS.map(({ label, segment }) => {
        const href = segment ? `${basePath}/${segment}` : basePath;
        const active = segment ? pathname.startsWith(href) : pathname === basePath || pathname.startsWith(`${basePath}/pools/`);
        return (
          <Link
            key={label}
            href={href}
            replace
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-1 justify-center px-1 py-2.5 text-sm font-medium text-neutral-secondary outline-none transition-colors hover:text-obsidian focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-t-xs after:bg-accent-green after:opacity-0",
              active && "font-semibold text-obsidian after:opacity-100",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
