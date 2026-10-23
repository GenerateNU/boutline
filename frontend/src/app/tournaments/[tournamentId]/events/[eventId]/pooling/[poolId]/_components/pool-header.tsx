import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { PoolStatusBadge } from "../../_components/pool-status-badge";
import { poolTitle } from "../../_services/pool-title";
import type { PoolBoard } from "../../_types/pool-board";

import { PinPoolButton } from "./pin-pool-button";

interface PoolHeaderProps {
  pool: PoolBoard;
  eventId: string;
  poolingPath: string;
}

export function PoolHeader({ pool, eventId, poolingPath }: PoolHeaderProps) {
  const count = pool.fencers.length;

  return (
    <header className="flex flex-col gap-3">
      <Link
        href={poolingPath}
        className="flex w-fit items-center gap-1 text-sm font-light outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft aria-hidden className="size-4" />
        <span className="sr-only">Back to </span>Pooling
      </Link>
      <div className="flex items-start gap-3">
        <h1 className="flex-1 text-xl font-medium">{poolTitle(pool)}</h1>
        <PinPoolButton eventId={eventId} poolId={pool.id} />
      </div>
      <div className="flex items-center gap-2.5">
        <PoolStatusBadge status={pool.status} />
        <span aria-hidden className="size-1.5 rounded-full bg-neutral-400" />
        <span className="text-sm font-light">
          {count} {count === 1 ? "Fencer" : "Fencers"}
        </span>
      </div>
    </header>
  );
}
