"use client";

import { useSelectedLayoutSegment } from "next/navigation";

import { NavbarTab } from "@/components/primitives/navbar-tab";

// `segment` is a child directory of the layout rendering this nav; null is that layout's own page.
type Tab = {
  label: string;
  segment: string | null;
};

type NavbarTabsProps = {
  label: string;
  basePath: string;
  tabs?: Tab[];
};

function NavbarTabs({ label, basePath, tabs = [] }: NavbarTabsProps) {
  const activeSegment = useSelectedLayoutSegment();

  return (
    <nav
      data-slot="navbar-tabs"
      aria-label={label}
      className="flex rounded-xl bg-obsidian"
    >
      {tabs.map(({ label, segment }) => (
        <NavbarTab
          key={label}
          label={label}
          href={segment ? `${basePath}/${segment}` : basePath}
          active={segment === activeSegment}
        />
      ))}
    </nav>
  );
}

export { NavbarTabs };
