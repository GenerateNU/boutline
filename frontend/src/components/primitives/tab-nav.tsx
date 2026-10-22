"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

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

  return (
    <nav aria-label={label} className="flex border-b border-border">
      {tabs.map(({ label, segment }) => (
        <Link
          key={label}
          href={segment ? `${basePath}/${segment}` : basePath}
          aria-current={segment === activeSegment ? "page" : undefined}
          className="relative flex-1 px-3 py-2 text-center text-sm whitespace-nowrap text-brand outline-none transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-brand after:opacity-0 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset aria-[current=page]:after:opacity-100"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export { TabNav };
