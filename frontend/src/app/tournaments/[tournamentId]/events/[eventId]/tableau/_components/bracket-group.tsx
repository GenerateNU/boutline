import type { TableauBout } from "../../_types/tableau";
import { BracketMatch } from "./bracket-match";
import { matchesQuery } from "./tableau-utils";
import { TbaBout } from "./tba-bout";

type Slot = TableauBout | undefined;

interface BracketGroupProps {
  slots: Slot[];
  query: string;
  boutBasePath: string;
}

function BracketGroup({ slots, query, boutBasePath }: BracketGroupProps) {
  return (
    <div className="relative flex flex-1 flex-col">
      {slots.map((bout, slotIndex) => (
        <div key={slotIndex} className="flex min-h-35 flex-1 items-center">
          {bout ? (
            <BracketMatch
              bout={bout}
              href={`${boutBasePath}/${bout.id}`}
              dimmed={!matchesQuery(bout, query)}
            />
          ) : (
            <TbaBout dimmed={query.trim() !== ""} />
          )}
        </div>
      ))}
      {slots.length === 2 && (
        <>
          {/* ⊐ shape joining the centers of the two bouts */}
          <p
            aria-hidden
            className="absolute top-1/4 -right-4 h-1/2 w-4 border-y border-r border-foreground"
          />
          {/* line from the middle of ⊐ to the next round */}
          <p aria-hidden className="absolute top-1/2 -right-8 w-4 border-t border-foreground" />
        </>
      )}
    </div>
  );
}

export { BracketGroup };
export type { Slot };
