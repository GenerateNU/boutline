"use client";

import { useSelectedLayoutSegment } from "next/navigation";

import { Background } from "@/components/primitives/background";

// Only the Fencers tab (the index page, so no segment) has the pattern behind the dashboard.
export function FencersBackground() {
  if (useSelectedLayoutSegment() !== null) {
    return null;
  }
  return <Background version={6} className="opacity-50" />;
}
