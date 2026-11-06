import { ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { Dialog } from "radix-ui";

import { MockCountry } from "@/app/tournaments/[tournamentId]/_components/mock-country";
import { Button } from "@/components/primitives/button";
import { Stat, StatRow } from "@/components/primitives/stat-row";
import { Tag } from "@/components/primitives/tag";
import type { PoolBoutResult, PoolStanding } from "../../_types/results";

function PoolBoutRow({ bout }: { bout: PoolBoutResult }) {
  const { opponent, touchesScored, touchesReceived } = bout;

  return (
    <li className="flex items-center gap-2">
      <p className="flex size-5 shrink-0 items-center justify-center rounded-sm bg-foreground text-xs text-background">
        {touchesScored > touchesReceived ? "V" : "D"}
      </p>
      <p className="w-8 shrink-0 font-mono text-sm font-medium">
        {touchesScored}-{touchesReceived}
      </p>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm uppercase">
          vs. {opponent.firstName} {opponent.lastName}
        </p>
        <p className="truncate text-xs text-muted-foreground uppercase">
          <MockCountry /> - {opponent.club || "No club"}
        </p>
      </div>
    </li>
  );
}

interface FencerPoolDialogProps {
  standing: PoolStanding;
  fencerHref: string;
}

function FencerPoolDialog({ standing, fencerHref }: FencerPoolDialogProps) {
  const {
    fencer,
    pool,
    poolPlace,
    victories,
    victoryRatio,
    touchesScored,
    touchesReceived,
    indicator,
    bouts,
  } = standing;

  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/20" />
      <Dialog.Content
        aria-describedby={undefined}
        className="fixed inset-x-4 top-1/2 z-50 mx-auto flex max-h-dvh max-w-88 -translate-y-1/2 flex-col overflow-y-auto gap-4 rounded-xl border border-foreground bg-background p-4"
      >
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase">Fencer in pool {pool}</p>
          <Dialog.Close asChild>
            <Button variant="text" size="icon" aria-label="Close" className="-m-2">
              <X aria-hidden className="size-4" />
            </Button>
          </Dialog.Close>
        </div>

        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <Dialog.Title className="truncate text-lg font-medium uppercase">
              {fencer.firstName} {fencer.lastName}
            </Dialog.Title>
            <p className="text-xs text-muted-foreground uppercase">{fencer.rating}</p>
          </div>
          <Tag>Place {poolPlace}</Tag>
        </div>

        <StatRow>
          <Stat label="V-D" value={`${victories}-${bouts.length - victories}`} />
          <Stat label="V/M" value={victoryRatio.toFixed(2)} />
          <Stat label="TS" value={touchesScored} />
          <Stat label="TR" value={touchesReceived} />
          <Stat label="Ind" value={indicator > 0 ? `+${indicator}` : indicator} />
        </StatRow>

        <ul className="flex flex-col gap-3">
          {bouts.map((bout) => (
            <PoolBoutRow key={bout.opponent.id} bout={bout} />
          ))}
        </ul>

        <Link
          href={fencerHref}
          className="flex items-center justify-center gap-1 rounded-md border border-foreground py-2 text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          Open fencer details
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      </Dialog.Content>
    </Dialog.Portal>
  );
}

export { FencerPoolDialog };
