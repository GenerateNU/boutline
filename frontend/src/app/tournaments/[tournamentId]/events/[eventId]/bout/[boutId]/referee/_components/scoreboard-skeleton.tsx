import PlayArrowOutlined from "@mui/icons-material/PlayArrowOutlined";

import { Button } from "@/components/primitives/button";
import { Section } from "@/components/primitives/section";
import { Skeleton } from "@/components/primitives/skeleton";

const SIDES = [0, 1];
const HISTORY_ROW_COUNT = 3;

export function ScoreboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <span role="status" className="sr-only">
        Loading bout
      </span>
      <Section title="Referee view">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          First to <Skeleton className="h-3 w-4" />
        </div>
        <Button disabled className="h-14 w-full touch-manipulation rounded-xl text-base">
          <PlayArrowOutlined />
          Start match
        </Button>
        <ul aria-hidden className="grid grid-cols-2 gap-3">
          {SIDES.map((side) => (
            <li
              key={side}
              className="flex min-w-0 flex-col items-center gap-4 rounded-lg border border-foreground px-3 py-10"
            >
              <div className="flex w-full flex-col items-center gap-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-32 w-full" />
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Score history">
        <ul aria-hidden className="flex flex-col divide-y divide-border">
          {Array.from({ length: HISTORY_ROW_COUNT }, (_, index) => (
            <li key={index} className="py-2">
              <Skeleton className="h-5 w-full" />
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
