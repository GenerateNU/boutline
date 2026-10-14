"use client";

import { Play, Undo2 } from "lucide-react";

import { Button } from "@/components/primitives/button";
import { Section } from "@/components/primitives/section";

import { useBoutScoring } from "../_hooks/use-bout-scoring";
import { competitorIdsOf, winnerFirst } from "../tally-helper";

import { BoutOverBanner } from "./bout-over-banner";
import { ConfirmButton } from "./confirm-button";
import { ConfirmResultBanner } from "./confirm-result-banner";
import { MatchPointBanner } from "./match-point-banner";
import { ScoreHistory } from "./score-history";
import { ScorePanel } from "./score-panel";

interface ScoreboardProps {
  boutId: string;
}

export function Scoreboard({ boutId }: ScoreboardProps) {
  // TODO: restore the referee gate once the fallback scorer is removed.
  // const { board, error, canScore, canUndo, locked, tally, touch, undo } = useBoutScoring(boutId);
  const {
    board,
    error,
    phase,
    starting,
    canUndo,
    tally,
    history,
    confirmedBy,
    start,
    touch,
    undo,
    confirm,
  } = useBoutScoring(boutId);

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
  const notStarted = phase === "not-started";
  const scoring = phase === "scoring";
  const confirming = phase === "confirming";
  const over = phase === "over";
  const showMatchPoint = scoring && tally.onMatchPoint.length > 0;
  const showUndo = scoring || confirming;

  return (
    <>
      <Section title="Referee view">
        <p className="text-xs text-muted-foreground">First to {board.bout.points_to_win}</p>
        {notStarted && (
          <Button
            disabled={starting}
            onClick={start}
            className="h-14 w-full touch-manipulation rounded-xl text-base"
          >
            <Play />
            {starting ? "Starting…" : "Start match"}
          </Button>
        )}
        {over && <BoutOverBanner winnerName={tally.winnerId && nameOf(tally.winnerId)} />}
        {confirming && tally.winnerId && (
          <ConfirmResultBanner
            winnerName={nameOf(tally.winnerId)}
            score={winnerFirst(tally.scores, competitorIdsOf(board.bout), tally.winnerId)}
          />
        )}
        {showMatchPoint && <MatchPointBanner names={tally.onMatchPoint.map(nameOf)} />}
        <div className="grid grid-cols-2 gap-3">
          {board.competitors.map(({ id, team }, side) => (
            <ScorePanel
              key={id}
              name={nameOf(id)}
              team={team}
              score={tally.scores[side]}
              scoringClosed={!scoring}
              // TODO: restore the referee gate once the fallback scorer is removed.
              // disabled={!canScore}
              onTouch={() => touch(id)}
            />
          ))}
        </div>
        {confirming && (
          <div className="grid grid-cols-2 gap-3">
            {board.competitors.map(({ id }) => (
              <ConfirmButton
                key={id}
                name={nameOf(id)}
                confirmed={confirmedBy.includes(id)}
                onConfirm={() => confirm(id)}
              />
            ))}
          </div>
        )}
        {showUndo && (
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
      <ScoreHistory rows={history} nameOf={nameOf} />
    </>
  );
}
