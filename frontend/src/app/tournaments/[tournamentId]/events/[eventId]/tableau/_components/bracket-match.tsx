"use client";

import Link from "next/link";
import { cn } from "cn";

import { usePinnedItems } from "@/features/pinning/hooks/use-pinned-items";
import type { TableauBout } from "../../_types/tableau";
import { BoutLocation } from "./bout-location";
import { BoutPinButton } from "./bout-pin-button";
import { BracketFencerRow } from "./bracket-fencer-row";
import { pillTones } from "./bout-pill-tones";
import { DIMMED_OVERLAY } from "./dimmed-overlay";

interface BracketMatchProps {
  bout: TableauBout;
  href: string;
  dimmed: boolean; // true when it doesn't match a search
  matched?: boolean; // true when it matches a non-empty search
}

function BracketMatch({
  bout,
  href,
  dimmed = false,
  matched = false,
}: BracketMatchProps) {
  const { pinned, pinBout, unpinBout } = usePinnedItems();
  const isPinned = pinned.boutIds.includes(bout.id);
  const live = bout.status === "active";
  const [topTone, bottomTone] = pillTones(bout);
  const muted = bout.status === "upcoming";

  // The pin is a sibling of the link, not inside it, so pressing it never opens
  // the bout. The card frame is on the wrapper so the location and the pin both
  // measure from inside its border, and the overlay greys the pin as well.
  return (
    <div
      className={cn(
        "relative w-full rounded-lg shadow-md",
        isPinned ? "bg-blue-lightest" : "bg-card",
        matched && "h-35 border-2 border-blue-vivid",
        !matched && live && "h-34.75 border-[1.5px] border-accent-green",
        !matched && !live && "h-34.5 border border-outline",
        !matched && muted && "border-dashed",
        { [DIMMED_OVERLAY]: dimmed },
      )}
    >
      <Link
        href={href}
        data-matched={matched || undefined}
        className="block h-full rounded-[inherit] px-3 transition-colors hover:bg-muted"
      >
        {live && <span className="sr-only">Live</span>}
        <div className="flex h-full flex-col">
          <BoutLocation location={bout.location} className="mt-3 mr-7" />
          <div className="flex flex-1 flex-col divide-y divide-outline">
            <BracketFencerRow
              fencer={bout.top}
              score={bout.topScore}
              pillTone={topTone}
              muted={muted}
            />
            <BracketFencerRow
              fencer={bout.bottom}
              score={bout.bottomScore}
              pillTone={bottomTone}
              muted={muted}
            />
          </div>
        </div>
      </Link>
      <BoutPinButton
        pinned={isPinned}
        onClick={() => (isPinned ? unpinBout(bout.id) : pinBout(bout.id))}
      />
    </div>
  );
}

export { BracketMatch };
