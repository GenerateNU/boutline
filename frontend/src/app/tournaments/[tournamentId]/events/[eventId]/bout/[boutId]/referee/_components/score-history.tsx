import { Section } from "@/components/primitives/section";

import type { HistoryEntry } from "../_types/tally";

interface ScoreHistoryProps {
  history: HistoryEntry[];
  nameOf: (competitorId: string) => string;
}

function formatTime(recordedAt: string | null) {
  if (recordedAt === null) return "Saving…";
  return new Date(recordedAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function ScoreHistory({ history, nameOf }: ScoreHistoryProps) {
  return (
    <Section title="Score history">
      {history.length === 0 ? (
        <p className="text-sm text-muted-foreground">No touches yet.</p>
      ) : (
        <ol aria-label="Score history" className="flex flex-col divide-y divide-border text-sm">
          {[...history].reverse().map(({ key, scorerId, recordedAt, scores }) => (
            <li key={key} className="flex items-center justify-between gap-4 py-2">
              <p className="text-xs text-muted-foreground tabular-nums">
                {formatTime(recordedAt)}
              </p>
              <p className="flex-1">Touch {nameOf(scorerId)}</p>
              <p className="font-medium tabular-nums">
                {scores[0]} - {scores[1]}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}

export { ScoreHistory };
