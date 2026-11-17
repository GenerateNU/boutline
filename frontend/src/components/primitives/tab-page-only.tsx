"use client";

import { usePathname } from "next/navigation";

interface TabPageOnlyProps {
  basePath: string;
  children: React.ReactNode;
}

// A tabbed layout's header belongs to its tab pages; a page nested under a tab draws its
// own back button instead. Matched on the URL, like TabNav, so a loading screen drawn
// above the layout agrees with it.
function TabPageOnly({ basePath, children }: TabPageOnlyProps) {
  const pathname = usePathname();
  const depth = pathname.slice(basePath.replace(/\/+$/, "").length).split("/").filter(Boolean).length;

  return depth <= 1 ? children : null;
}

export { TabPageOnly };
