"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { NavigationBar } from "@/components/primitives/navigation/navigation-bar";

import { poolingView } from "../_services/pooling-view";

// Read from the URL on the client, so the loading screen marks the same tab as the page.
export function PoolingViewTabs() {
  const pathname = usePathname();
  const view = poolingView(useSearchParams().get("view"));

  return (
    <NavigationBar
      aria-label="Pooling view"
      surface="light"
      items={[
        { label: "Pools", href: pathname, active: view === "pools" },
        { label: "Pool Results", href: `${pathname}?view=results`, active: view === "results" },
      ]}
    />
  );
}
