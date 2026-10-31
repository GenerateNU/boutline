"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/primitives/button";
import type { Competitor } from "@/types/competitor";

type CheckInListProps = {
  competitors: Competitor[];
};

function CheckInList({ competitors }: CheckInListProps) {
  const checkedIn = new Set<string>();
  const [absent, setAbsent] = useState<Set<string>>(new Set());

  return (
    <section className="flex flex-col rounded-lg bg-chip px-3 pt-2 pb-1">
      <header className="flex items-center justify-between border-b border-foreground pb-2">
        <h3 className="text-xl">Check in:</h3>
        <span className="text-xs">{checkedIn.size} checked in</span>
      </header>
      <ul>
        {competitors.map(({ id, firstName, lastName }) => (
          <li
            key={id}
            className="mx-2 flex min-h-12 items-center justify-between border-b border-foreground text-sm uppercase last:border-b-0"
          >
            {firstName} {lastName}
            {checkedIn.has(id) ? (
              <Check aria-label="Checked in" className="size-5 text-success" />
            ) : absent.has(id) ? (
              <span className="text-xs text-muted-foreground normal-case">Absent</span>
            ) : (
              <Button
                type="button"
                className="h-7 rounded-lg bg-destructive px-2 text-xs font-normal text-background normal-case hover:bg-destructive/90"
                onClick={() => setAbsent((previous) => new Set(previous).add(id))}
              >
                Mark absent
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export { CheckInList };
