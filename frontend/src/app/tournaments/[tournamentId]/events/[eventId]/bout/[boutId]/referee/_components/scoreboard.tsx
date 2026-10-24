"use client";

import { Section } from "@/components/primitives/section";

import { useBoutScoring } from "../_hooks/use-bout-scoring";
import { competitorIdsOf } from "../tally-helper";

import { PhaseControls } from "./phase-controls";
import { PhaseHeader } from "./phase-header";
import { ScoreHistory } from "./score-history";
import { ScorePanel } from "./score-panel";

interface ScoreboardProps {
  boutId: string;
}

export function Scoreboard({ boutId }: ScoreboardProps) {
  // TODO: restore the referee gate once the fallback scorer is removed.
  // const { matchup, error, canScore, canUndo, locked, tally, touch, undo } = useBoutScoring(boutId);
  const {
    matchup,
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

  if (!matchup || !tally || !phase) {
    return (
      <Section title="Referee view">
        <p role={error ? "alert" : "status"} className="text-sm text-muted-foreground">
          {error ?? "Loading bout…"}
        </p>
      </Section>
    );
  }

  const names = new Map(
    matchup.competitors.map(({ id, firstName, lastName }) => [id, `${firstName} ${lastName}`]),
  );
  const nameOf = (competitorId: string) => names.get(competitorId) ?? "Unknown fencer";
  const competitorIds = competitorIdsOf(matchup.bout);

  return (
    <>
      <Section title="Referee view">
        <p className="text-xs text-muted-foreground">First to {matchup.bout.points_to_win}</p>
        <PhaseHeader
          phase={phase}
          scores={tally.scores}
          competitorIds={competitorIds}
          starting={starting}
          nameOf={nameOf}
          onStart={start}
        />
        <div className="grid grid-cols-2 gap-3">
          {matchup.competitors.map(({ id, team }, side) => (
            <ScorePanel
              key={id}
              name={nameOf(id)}
              team={team}
              score={tally.scores[side]}
              scoringClosed={phase.kind !== "scoring"}
              // TODO: restore the referee gate once the fallback scorer is removed.
              // disabled={!canScore}
              onTouch={() => touch(id)}
            />
          ))}
        </div>
        <PhaseControls
          phase={phase}
          competitorIds={competitorIds}
          confirmedBy={confirmedBy}
          canUndo={canUndo}
          nameOf={nameOf}
          onConfirm={confirm}
          onUndo={undo}
        />
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
