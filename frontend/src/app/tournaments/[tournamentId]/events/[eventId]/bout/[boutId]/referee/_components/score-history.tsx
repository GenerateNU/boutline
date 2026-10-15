import { cn } from "cn";

import { Section } from "@/components/primitives/section";
import { formatTime } from "@/utils/format-time";

import { HistoryRow } from "../_types/history-row";

interface ScoreHistoryProps {
  rows: HistoryRow[];
  nameOf: (competitorId: string) => string;
}

export function ScoreHistory({ rows, nameOf }: ScoreHistoryProps) {
  return (
    <Section title="Score history">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No touches yet.</p>
      ) : (
        <ol aria-label="Score history" className="flex flex-col divide-y divide-border text-sm">
          {rows.map(({ key, scorerId, recordedAt, scores, revoked }) => (
            <li key={key} className="flex items-center justify-between gap-4 py-2">
              <p className="text-xs text-muted-foreground tabular-nums">
                {formatTime(recordedAt)}
              </p>
              <p className={cn("flex-1", revoked && "text-muted-foreground")}>
                Touch {nameOf(scorerId)}
              </p>
              {scores !== null && (
                <p className={cn("font-medium tabular-nums", revoked && "text-muted-foreground")}>
                  {scores[0]} - {scores[1]}
                </p>
              )}
              {revoked && <p className="text-xs text-muted-foreground">Revoked</p>}
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}
