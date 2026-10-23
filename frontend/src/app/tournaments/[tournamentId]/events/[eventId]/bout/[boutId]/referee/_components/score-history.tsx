import { cn } from "cn";

import { Section } from "@/components/primitives/section";
import { formatTime } from "@/utils/format-time";

import { HistoryRow } from "../_types/history-row";

interface ScoreHistoryProps {
  rows: HistoryRow[];
  failed: boolean;
  nameOf: (competitorId: string) => string;
}

export function ScoreHistory({ rows, failed, nameOf }: ScoreHistoryProps) {
  return (
    <Section title="Score history">
      {failed && (
        <p role="status" className="text-sm text-destructive">
          Couldn&apos;t load the latest score history.
        </p>
      )}
      {rows.length === 0 ? (
        !failed && <p className="text-sm text-muted-foreground">No touches yet.</p>
      ) : (
        <ol aria-label="Score history" className="flex flex-col divide-y divide-border text-sm">
          {rows.map(({ key, scorerId, recordedAt, scores, revoked }) => (
            <li key={key} className="flex items-center justify-between gap-4 py-2">
              <p className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {formatTime(recordedAt)}
              </p>
              <p className={cn("min-w-0 flex-1 truncate", revoked && "text-muted-foreground")}>
                Touch {nameOf(scorerId)}
              </p>
              {scores !== null && (
                <p className={cn("shrink-0 font-medium tabular-nums", revoked && "text-muted-foreground")}>
                  {scores[0]} - {scores[1]}
                </p>
              )}
              {revoked && <p className="shrink-0 text-xs text-muted-foreground">Revoked</p>}
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}
