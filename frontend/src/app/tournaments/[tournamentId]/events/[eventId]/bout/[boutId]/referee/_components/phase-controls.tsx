import { Undo2 } from "lucide-react";

import { Button } from "@/components/primitives/button";

import { ScoringPhase } from "../_types/scoring-state";

import { ConfirmButton } from "./confirm-button";

interface PhaseControlsProps {
  phase: ScoringPhase;
  competitorIds: [string, string];
  confirmedBy: string[];
  canUndo: boolean;
  nameOf: (competitorId: string) => string;
  onConfirm: (competitorId: string) => void;
  onUndo: () => void;
}

export function PhaseControls({
  phase,
  competitorIds,
  confirmedBy,
  canUndo,
  nameOf,
  onConfirm,
  onUndo,
}: PhaseControlsProps) {
  const undoButton = (
    <Button
      variant="outline"
      disabled={!canUndo}
      onClick={onUndo}
      className="h-14 w-full touch-manipulation rounded-xl text-base"
    >
      <Undo2 />
      Undo last touch
    </Button>
  );

  switch (phase.kind) {
    case "scoring":
      return undoButton;
    case "confirming":
      return (
        <>
          <div className="grid grid-cols-2 gap-3">
            {competitorIds.map((id) => (
              <ConfirmButton
                key={id}
                name={nameOf(id)}
                confirmed={confirmedBy.includes(id)}
                onConfirm={() => onConfirm(id)}
              />
            ))}
          </div>
          {undoButton}
        </>
      );
    case "not-started":
    case "over":
      return null;
  }
}
