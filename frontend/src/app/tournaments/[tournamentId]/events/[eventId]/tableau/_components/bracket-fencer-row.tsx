import { cn } from "cn";

import type { TableauFencer } from "../../_types/tableau";

type NameTone = "strong" | "muted";
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
  nameTone: NameTone;
  pillTone: PillTone;
}

function BracketFencerRow({ fencer, score, nameTone, pillTone }: BracketFencerRowProps) {
  return (
    <div className="flex flex-1 items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm uppercase", nameTone === "strong" ? "text-obsidian" : "text-neutral-secondary")}>
          {fencer.firstName} {fencer.lastName}
        </p>
        {fencer.club && <p className="truncate text-xs uppercase text-neutral-secondary">{fencer.club}</p>}
      </div>
      <p className={cn("flex h-6 min-w-7 items-center justify-center rounded-sm px-2 text-sm", PILL_STYLES[pillTone])}>
        {score ?? "–"}
      </p>
    </div>
  );
}

export { BracketFencerRow };
export type { NameTone, PillTone };
