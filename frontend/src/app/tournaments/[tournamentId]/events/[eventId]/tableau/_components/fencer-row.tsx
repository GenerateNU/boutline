import type { TableauFencer } from "../../_types/tableau";
import { fullName } from "./tableau-utils";

interface FencerRowProps {
  fencer: TableauFencer;
  score?: number;
  showSeed?: boolean;
}

function FencerRow({ fencer, score, showSeed = false }: FencerRowProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      {showSeed && <p className="w-5 text-center">{fencer.seed}</p>}
      <div className="min-w-0 flex-1">
        <p className="truncate">{fullName(fencer)}</p>
        {fencer.club && (
          <p className="truncate text-xs text-muted-foreground">{fencer.club}</p>
        )}
      </div>
      {score !== undefined && (
        <p className="min-w-7 rounded-md bg-foreground px-2 py-0.5 text-center text-sm text-background">
          {score}
        </p>
      )}
    </div>
  );
}

export { FencerRow };