"use client";

import { usePathname } from "next/navigation";

import { NavigationBar } from "@/components/primitives/navigation/navigation-bar";

// `segment` is a child directory of the layout rendering this nav; null is that layout's own page.
interface Tab {
  label: string;
  segment: string | null;
}

interface TabNavProps {
  label: string;
  basePath: string;
  tabs: Tab[];
}

function TabNav({ label, basePath, tabs }: TabNavProps) {
  const pathname = usePathname();
  const root = basePath.replace(/\/+$/, "");

  return (
    // From lg up the row sits inside the global navbar, right of its blade and clear of the
    // logout button. That needs no positioned ancestor between <body> and this nav.
    <div className="bg-obsidian shadow-md lg:absolute lg:top-0 lg:right-16 lg:left-80 lg:h-10 lg:shadow-none">
      <NavigationBar
        aria-label={label}
        className="mx-auto max-w-mobile rounded-none lg:h-full lg:max-w-none lg:*:h-full lg:*:flex-none"
        items={tabs.map(({ label, segment }) => {
          const href = segment ? `${root}/${segment}` : basePath;
          // Matched on the URL rather than the layout segment, so a loading screen
          // drawn above the layout marks the same tab.
          const active = segment
            ? pathname === href || pathname.startsWith(`${href}/`)
            : pathname === (root || "/");
          // Tabs replace history so Back leaves the page; going up from a nested page (an event to Events) pushes.
          return { label, href, active, replace: !(active && pathname !== href) };
        })}
      />
    </div>
  );
}

export { TabNav };
