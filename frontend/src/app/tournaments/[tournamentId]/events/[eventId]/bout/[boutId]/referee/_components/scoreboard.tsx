"use client";

import { Undo2 } from "lucide-react";

import { Button } from "@/components/primitives/button";
import { Section } from "@/components/primitives/section";

import { useBoutScoring } from "../_hooks/use-bout-scoring";

import { BoutOverBanner } from "./bout-over-banner";
import { MatchPointBanner } from "./match-point-banner";
import { ScoreHistory } from "./score-history";
import { ScorePanel } from "./score-panel";

interface ScoreboardProps {
  boutId: string;
}

function Scoreboard({ boutId }: ScoreboardProps) {
  // TODO: restore the referee gate once the fallback scorer is removed.
  // const { board, error, canScore, canUndo, locked, tally, touch, undo } = useBoutScoring(boutId);
  const { board, error, canUndo, locked, tally, touch, undo } = useBoutScoring(boutId);

  if (!board || !tally) {
    return (
      <Section title="Referee view">
        <p role={error ? "alert" : "status"} className="text-sm text-muted-foreground">
          {error ?? "Loading bout…"}
        </p>
      </Section>
    );
  }

  const names = new Map(
    board.competitors.map(({ id, firstName, lastName }) => [id, `${firstName} ${lastName}`]),
  );
  const nameOf = (competitorId: string) => names.get(competitorId) ?? "Unknown fencer";

  return (
    <>
      <Section title="Referee view">
        <p className="text-xs text-muted-foreground">First to {board.bout.points_to_win}</p>
        {locked ? (
          <BoutOverBanner winnerName={tally.winnerId && nameOf(tally.winnerId)} />
        ) : (
          tally.onMatchPoint.length > 0 && (
            <MatchPointBanner names={tally.onMatchPoint.map(nameOf)} />
          )
        )}
        <div className="grid grid-cols-2 gap-3">
          {board.competitors.map(({ id, team }, side) => (
            <ScorePanel
              key={id}
              name={nameOf(id)}
              team={team}
              score={tally.scores[side]}
              boutOver={locked}
              // TODO: restore the referee gate once the fallback scorer is removed.
              // disabled={!canScore}
              onTouch={() => touch(id)}
            />
          ))}
        </div>
        {!locked && (
          <Button
            variant="outline"
            disabled={!canUndo}
            onClick={undo}
            className="h-14 w-full touch-manipulation rounded-xl text-base"
          >
            <Undo2 />
            Undo last touch
          </Button>
        )}
        {/* TODO: restore the referee gate once the fallback scorer is removed.
        {!canScore && (
          <p className="text-sm text-muted-foreground">
            Assign a referee to this bout before scoring.
          </p>
        )} */}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </Section>
      <ScoreHistory history={tally.history} nameOf={nameOf} />
    </>
  );
}

export { Scoreboard };
