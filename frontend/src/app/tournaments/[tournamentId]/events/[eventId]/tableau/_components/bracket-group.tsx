import { cn } from "cn";

import type { TableauBout } from "../../_types/tableau";
import { BracketMatch } from "./bracket-match";
import { matchesQuery } from "./tableau-utils";
import { TbaBout } from "./tba-bout";

type Slot = TableauBout | undefined;

interface BracketGroupProps {
  slots: Slot[];
  query: string;
  boutBasePath: string;
  // A pair is the two bouts whose winners meet in the next round. pullPair
  // moves them closer together than the gap to the next pair. Only the first
  // round uses it; later bouts stay centered between the two they come from.
  pullPair?: boolean;
}

function BracketGroup({
  slots,
  query,
  boutBasePath,
  pullPair = false,
}: BracketGroupProps) {
  const searching = query.trim() !== "";
  const paired = slots.length === 2;
  const pulled = pullPair && paired;
  return (
    <div className="relative flex flex-1 flex-col">
      {slots.map((bout, slotIndex) => (
        <div
          key={slotIndex}
          className={cn(
            "flex min-h-43 flex-1",
            !pulled && "items-center",
            pulled && slotIndex === 0 && "items-end pb-3.5",
            pulled && slotIndex === 1 && "items-start pt-3.5",
          )}
        >
          <div className="relative w-full">
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
            {/* A pulled pair's ⊐ is drawn in halves, each from its bout's
                center to the middle of the gap between the two bouts. */}
            {pulled && (
              <div
                aria-hidden
                className={cn(
                  "absolute -right-3.5 w-3.5 border-r border-neutral-secondary",
                  slotIndex === 0
                    ? "top-1/2 -bottom-3.5 border-t"
                    : "-top-3.5 bottom-1/2 border-b",
                )}
              />
            )}
          </div>
        </div>
      ))}
      {paired && (
        <>
          {!pulled && (
            // ⊐ shape joining the centers of the two bouts
            <div
              aria-hidden
              className="absolute top-1/4 -right-3.5 h-1/2 w-3.5 border-y border-r border-neutral-secondary"
            />
          )}
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
