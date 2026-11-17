import { cn } from "cn";

import type { TableauFencer } from "../../_types/tableau";

type PillTone = "winner" | "neutral" | "mint" | "blue";

const PILL_STYLES: Record<PillTone, string> = {
  winner: "bg-green text-background",
  neutral: "bg-surface text-neutral-secondary",
  mint: "bg-mint-light text-mint-dark",
  blue: "bg-blue-soft text-blue-vivid",
};

interface BracketFencerRowProps {
  fencer: TableauFencer;
  score?: number;
  pillTone: PillTone;
  muted?: boolean; // names go gray for a bout that hasn't been fenced
}

function BracketFencerRow({
  fencer,
  score,
  pillTone,
  muted = false,
}: BracketFencerRowProps) {
  return (
    <div className="flex flex-1 items-center gap-3">
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm uppercase",
            muted ? "text-neutral-secondary" : "text-obsidian",
          )}
        >
          {fencer.firstName} {fencer.lastName}
        </p>
        {fencer.club && (
          <p className="truncate text-xs uppercase text-neutral-secondary">
            {fencer.club}
          </p>
        )}
      </div>
      <p
        className={cn(
          "flex h-6 min-w-7 items-center justify-center rounded-sm px-2 text-sm",
          PILL_STYLES[pillTone],
        )}
      >
        {score ?? "–"}
      </p>
    </div>
  );
}

export { BracketFencerRow };
export type { PillTone };
