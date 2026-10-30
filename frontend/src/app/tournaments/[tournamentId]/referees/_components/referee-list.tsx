"use client";

import { cn } from "cn";
import { useState } from "react";

import { Button } from "@/components/primitives/button";
import {
  AddParticipantSheet,
  type Participant,
} from "@/features/tournament/components/add-participant-sheet";

type Referee = Participant & {
  id: number;
  occupied: boolean;
};

// No referee backend yet, so referees live only in this component's state.
function RefereeList({ search }: { search: string }) {
  const [referees, setReferees] = useState<Referee[]>([]);
  const shown = referees.filter(({ name }) => name.toLowerCase().includes(search.toLowerCase()));

  function addReferee(participant: Participant) {
    setReferees((previous) => [...previous, { ...participant, id: Date.now(), occupied: false }]);
  }

  return (
    <>
      <AddParticipantSheet
        role="Referee"
        onAdd={addReferee}
        trigger={
          <Button type="button" className="self-start rounded-2xl">
            Add referees
          </Button>
        }
      />

      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {search ? `No referees match “${search}”.` : "No referees have been added yet."}
        </p>
      ) : (
        <section className="flex flex-col rounded-lg border-2 border-brand px-4 pt-3 pb-1 shadow-md shadow-brand/25">
          <h3 className="border-b border-foreground pb-2 text-xl">Referees:</h3>
          <ul>
            {shown.map(({ id, name, pool, occupied }) => (
              <li
                key={id}
                className="flex items-center justify-between border-b border-foreground py-3 last:border-b-0"
              >
                <div className="flex flex-col gap-2">
                  <span className="text-sm uppercase">{name}</span>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span
                      className={cn(
                        "rounded-sm px-2 py-0.5 text-background",
                        occupied ? "bg-warning" : "bg-success",
                      )}
                    >
                      {occupied ? "Occupied" : "Available"}
                    </span>
                    {pool && `Pool ${pool}`}
                  </div>
                </div>
                <Button
                  type="button"
                  className="h-10 rounded-lg bg-foreground px-3 hover:bg-foreground/90"
                  onClick={() => setReferees((previous) => previous.filter((referee) => referee.id !== id))}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export { RefereeList };
