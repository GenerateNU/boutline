"use client";

import { useSelectedLayoutSegment } from "next/navigation";

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
  const root = basePath.replace(/\/+$/, "");

  return (
    <NavigationBar
      aria-label={label}
      items={tabs.map(({ label, segment }) => ({
        label,
        href: segment ? `${root}/${segment}` : basePath,
        active: segment === activeSegment,
      }))}
    />
  );
}

export { TabNav };
