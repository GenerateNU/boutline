import { cn } from "cn";

import { BoutLocation } from "./bout-location";
import { BoutPinButton } from "./bout-pin-button";
import { DIMMED_OVERLAY } from "./dimmed-overlay";

interface TbaBoutProps {
  dimmed?: boolean;
}

// Stands in for a bout whose fencers aren't decided yet, e.g. the final before the semis finish.
// There's no bout to pin yet, so its pin is disabled but keeps the unpinned look.
function TbaBout({ dimmed = false }: TbaBoutProps) {
  return (
    <div
      role="group"
      aria-label="Bout to be announced"
      className={cn(
        "relative flex h-34.5 w-full flex-col rounded-md border border-dashed border-outline bg-card px-3 text-muted-foreground",
        { [DIMMED_OVERLAY]: dimmed },
      )}
    >
      {/* Same frame as BracketMatch, so its fencer divider lines up with the bracket connectors. */}
      <BoutLocation className="mt-3 mr-7" />
      <BoutPinButton
        pinned={false}
        disabled
        className="disabled:text-neutral-muted"
      />
      <div className="flex flex-1 flex-col divide-y divide-muted-foreground/40">
        {[0, 1].map((side) => (
          <div key={side} className="flex flex-1 flex-col justify-center">
            <p>TBA</p>
            <p className="text-xs">TBA</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export { TbaBout };
