"use client";

import ArrowForwardOutlined from "@mui/icons-material/ArrowForwardOutlined";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { useEffect, useState } from "react";

import { PoolStatusBadge } from "@/app/tournaments/[tournamentId]/events/[eventId]/pooling/_components/pool-status-badge";
import { boutsTable } from "@/app/tournaments/[tournamentId]/events/[eventId]/pooling/_services/pool-table-data";
import { poolTitle } from "@/app/tournaments/[tournamentId]/events/[eventId]/pooling/_services/pool-title";
import type { PoolBoard } from "@/app/tournaments/[tournamentId]/events/[eventId]/pooling/_types/pool-board";
import { Button } from "@/components/primitives/button";
import { Loading } from "@/components/primitives/loading";
import { Text } from "@/components/primitives/text";
import { fetchPinnedPools } from "@/features/pinning/services/pinned-pools-query";
import type { FencerBout } from "@/features/pinning/types/fencer-bout";
import { PoolTable } from "@/features/pool/components/pool-table";
import type { Competitor } from "@/types/competitor";
import { errorMessage } from "@/utils/error-message";

interface FencerPools {
  pools: PoolBoard[] | null;
  error: string | null;
}

function resultLabel({ status, score }: FencerBout) {
  if (status === "upcoming" || !score) {
    return "Upcoming";
  }
  const result = `${score[0]}–${score[1]}`;
  return status === "active" ? `${result} · In Progress` : result;
}

// The pools behind a fencer's pool bouts, loaded when the dialog opens.
function useFencerPools(bouts: FencerBout[]): FencerPools {
  const [settled, setSettled] = useState<FencerPools | null>(null);
  const idsKey = [...new Set(bouts.flatMap(({ poolId }) => (poolId ? [poolId] : [])))].join(",");

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const pools = await fetchPinnedPools(idsKey ? idsKey.split(",") : []);
        if (!ignore) {
          setSettled({ pools, error: null });
        }
      } catch (caught) {
        if (!ignore) {
          setSettled({ pools: null, error: errorMessage(caught) });
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [idsKey]);

  return settled ?? { pools: null, error: null };
}

interface PinnedFencerDialogProps {
  fencer: Competitor;
  bouts: FencerBout[];
  boutsError: string | null;
}

// Rendered inside a Dialog.Root, like the Results tab's fencer dialog.
function PinnedFencerDialog({ fencer, bouts, boutsError }: PinnedFencerDialogProps) {
  const { id, eventId, tournamentId, firstName, lastName, rating, ratingYear, team } = fencer;
  const { pools, error } = useFencerPools(bouts);

  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/20 motion-safe:data-[state=open]:animate-fade-in motion-safe:data-[state=closed]:animate-fade-out" />
      <Dialog.Content
        aria-describedby={undefined}
        className="fixed inset-x-4 top-1/2 z-50 mx-auto flex max-h-[90dvh] max-w-88 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-xl border border-foreground bg-background p-4 motion-safe:data-[state=open]:animate-pop-in motion-safe:data-[state=closed]:animate-pop-out"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Dialog.Title className="truncate text-lg font-medium uppercase">
              {firstName} {lastName}
            </Dialog.Title>
            <Text variant="caption" className="uppercase">
              {team || "No club"} &middot; {rating}
              {ratingYear}
            </Text>
          </div>
          <Dialog.Close asChild>
            <Button variant="text" size="icon" aria-label="Close" className="-m-2">
              <CloseOutlined aria-hidden className="size-4" />
            </Button>
          </Dialog.Close>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-dark">
            {error}
          </p>
        )}
        {!pools && !error && <Loading className="py-4" />}
        {pools?.map((pool) => (
          <section key={pool.id} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <h3 className="flex-1 text-sm font-medium">{poolTitle(pool)}</h3>
              <PoolStatusBadge status={pool.status} />
            </div>
            <PoolTable caption={`${poolTitle(pool)} bouts`} data={boutsTable(pool)} />
          </section>
        ))}

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Bouts</h3>
          {boutsError ? (
            <p role="alert" className="text-sm text-red-dark">
              {boutsError}
            </p>
          ) : bouts.length === 0 ? (
            <Text variant="caption">No bouts yet</Text>
          ) : (
            <ul aria-label="Bouts" className="flex flex-col gap-1">
              {bouts.map((bout) => (
                <li key={bout.id} className="flex items-center justify-between gap-4">
                  <Text variant="caption">{`${bout.stage} · vs ${bout.opponent}`}</Text>
                  <Text variant="caption">{resultLabel(bout)}</Text>
                </li>
              ))}
            </ul>
          )}
        </section>

        {tournamentId && (
          <Link
            href={`/tournaments/${encodeURIComponent(tournamentId)}/events/${encodeURIComponent(eventId)}/fencers/${encodeURIComponent(id)}`}
            className="flex items-center justify-center gap-1 rounded-md border border-foreground py-2 text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            Open fencer details
            <ArrowForwardOutlined aria-hidden className="size-4" />
          </Link>
        )}
      </Dialog.Content>
    </Dialog.Portal>
  );
}

export { PinnedFencerDialog };
