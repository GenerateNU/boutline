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
  const searching = query.trim() !== "";
  return (
    <div className="relative flex flex-1 flex-col">
      {slots.map((bout, slotIndex) => (
        <div key={slotIndex} className="flex min-h-35 flex-1 items-center">
          {bout ? (
            <BracketMatch
              bout={bout}
              href={`${boutBasePath}/${bout.id}`}
              dimmed={!matchesQuery(bout, query)}
              matched={searching && matchesQuery(bout, query)}
            />
          ) : (
            <TbaBout dimmed={searching} />
          )}
        </div>
      ))}
      {slots.length === 2 && (
        <>
          {/* ⊐ shape joining the centers of the two bouts */}
          <div
            aria-hidden
            className="absolute top-1/4 -right-3.5 h-1/2 w-3.5 border-y border-r border-neutral-secondary"
          />
          {/* line from the middle of ⊐ to the next round */}
          <div
            aria-hidden
            className="absolute top-1/2 -right-11.5 w-8 border-t border-neutral-secondary"
          />
        </>
      )}
    </div>
  );
}

export { BracketGroup };
export type { Slot };
