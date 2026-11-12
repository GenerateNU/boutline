"use client";

import { useSelectedLayoutSegment } from "next/navigation";

import { NavbarTab } from "@/components/primitives/navbar-tab";

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
    <nav aria-label={label} className="flex rounded-xl bg-obsidian">
      {tabs.map(({ label, segment }) => (
        <NavbarTab
          key={label}
          label={label}
          href={segment ? `${root}/${segment}` : basePath}
          active={segment === activeSegment}
        />
      ))}
    </nav>
  );
}

export { TabNav };
