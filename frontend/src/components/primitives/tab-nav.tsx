"use client";

import { usePathname, useSelectedLayoutSegment } from "next/navigation";

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
  const activeSegment = useSelectedLayoutSegment();
  const pathname = usePathname();
  const root = basePath.replace(/\/+$/, "");

  return (
    <NavigationBar
      aria-label={label}
      items={tabs.map(({ label, segment }) => {
        const href = segment ? `${root}/${segment}` : basePath;
        const active = segment === activeSegment;
        // Tabs replace history so Back leaves the page; going up from a nested page (an event to Events) pushes.
        return { label, href, active, replace: !(active && pathname !== href) };
      })}
    />
  );
}

export { TabNav };
