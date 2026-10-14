import { cn } from "cn";
import { Plus } from "lucide-react";

import { Button } from "@/components/primitives/button";

interface ScorePanelProps {
  name: string;
  team: string;
  score: number;
  boutOver: boolean;
  // TODO: restore the referee gate once the fallback scorer is removed.
  // disabled: boolean;
  onTouch: () => void;
}

export function ScorePanel({ name, team, score, boutOver, /* disabled, */ onTouch }: ScorePanelProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-lg border border-foreground px-3",
        boutOver ? "py-10" : "py-6",
      )}
    >
      <div className="flex w-full flex-col items-center gap-1 text-center">
        <p className="w-full truncate text-sm font-medium">{name}</p>
        <p className="w-full truncate text-xs text-muted-foreground">{team || "No club"}</p>
      </div>
      <output
        aria-label={`${name} score`}
        className={cn("font-medium tabular-nums", boutOver ? "text-9xl" : "text-8xl")}
      >
        {score}
      </output>
      {!boutOver && (
        <Button
          aria-label={`Touch ${name}`}
          // TODO: restore the referee gate once the fallback scorer is removed.
          // disabled={disabled}
          onClick={onTouch}
          className="h-32 w-full touch-manipulation rounded-xl [&_svg]:size-16"
        >
          <Plus strokeWidth={3} />
        </Button>
      )}
    </div>
  );
}
