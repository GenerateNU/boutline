import { Play } from "lucide-react";

import { Button } from "@/components/primitives/button";

import { ScoringPhase } from "../_types/scoring-state";
import { winnerFirst } from "../tally-helper";

import { BoutOverBanner } from "./bout-over-banner";
import { ConfirmResultBanner } from "./confirm-result-banner";
import { MatchPointBanner } from "./match-point-banner";

interface PhaseHeaderProps {
  phase: ScoringPhase;
  scores: [number, number];
  competitorIds: [string, string];
  starting: boolean;
  nameOf: (competitorId: string) => string;
  onStart: () => void;
}

export function PhaseHeader({ phase, scores, competitorIds, starting, nameOf, onStart }: PhaseHeaderProps) {
  switch (phase.kind) {
    case "not-started":
      return (
        <Button
          disabled={starting}
          onClick={onStart}
          className="h-14 w-full touch-manipulation rounded-xl text-base"
        >
          <Play />
          {starting ? "Starting…" : "Start match"}
        </Button>
      );
    case "scoring":
      return phase.onMatchPoint.length > 0 ? <MatchPointBanner names={phase.onMatchPoint.map(nameOf)} /> : null;
    case "confirming":
      return (
        <ConfirmResultBanner
          winnerName={nameOf(phase.winnerId)}
          score={winnerFirst(scores, competitorIds, phase.winnerId)}
        />
      );
    case "over":
      return <BoutOverBanner winnerName={phase.winnerId && nameOf(phase.winnerId)} />;
  }
}
