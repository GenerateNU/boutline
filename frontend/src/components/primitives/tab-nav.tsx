"use client";

import Link from "next/link";
import { usePathname, useSelectedLayoutSegment } from "next/navigation";

// null is the layout's own page.
interface Tab {
  label: string;
  segment: string | null;
}

interface TabNavProps {
  label: string;
  basePath: string;
  tabs: Tab[];
}

interface TabNavLinkProps {
  label: string;
  href: string;
  isActive: boolean;
}

function TabNavLink({ label, href, isActive }: TabNavLinkProps) {
  const pathname = usePathname();
  // Tabs replace history so Back leaves the page; going up from a nested page (an event to Events) pushes.
  const isAncestorTab = isActive && pathname !== href;

  return (
    <Link
      replace={!isAncestorTab}
      href={href}
      aria-current={isActive ? "page" : undefined}
      className="flex-1 border-l border-foreground px-5 py-2 text-center text-sm whitespace-nowrap outline-none transition-colors first:border-l-0 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset aria-[current=page]:text-selected"
    >
      {label}
    </Link>
  );
}

function TabNav({ label, basePath, tabs }: TabNavProps) {
  const activeSegment = useSelectedLayoutSegment();

  return (
    <nav
      aria-label={label}
      className="flex overflow-hidden rounded-full border border-foreground"
    >
      {tabs.map(({ label, segment }) => (
        <TabNavLink
          key={label}
          label={label}
          href={segment ? `${basePath}/${segment}` : basePath}
          isActive={segment === activeSegment}
        />
      ))}
    </nav>
  );
}

export { TabNav };
