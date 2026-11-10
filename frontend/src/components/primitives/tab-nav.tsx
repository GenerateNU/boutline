"use client";

import Link from "next/link";
import { usePathname, useSelectedLayoutSegment } from "next/navigation";

// `segment` is a child directory of the layout rendering this nav; null is that layout's own page.
type Tab = {
  label: string;
  segment: string | null;
};

type TabNavProps = {
  label: string;
  basePath: string;
  tabs: Tab[];
};

function TabNav({ label, basePath, tabs }: TabNavProps) {
  const activeSegment = useSelectedLayoutSegment();
  const pathname = usePathname();

  return (
    <nav
      aria-label={label}
      className="flex overflow-hidden rounded-full border border-foreground"
    >
      {tabs.map(({ label, segment }) => {
        const href = segment ? `${basePath}/${segment}` : basePath;
        const isActive = segment === activeSegment;
        // Tabs replace the history entry so Back leaves the page instead of stepping through tabs.
        // The active tab clicked from a page nested under it (an event, back to Events) is pushed
        // instead: replacing would leave two Events entries in a row.
        const isAncestorTab = isActive && pathname !== href;

        return (
          <Link
            key={label}
            replace={!isAncestorTab}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className="flex-1 border-l border-foreground px-5 py-2 text-center text-sm whitespace-nowrap outline-none transition-colors first:border-l-0 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset aria-[current=page]:text-selected"
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export { TabNav };
