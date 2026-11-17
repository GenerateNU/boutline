import { BackButton } from "@/components/primitives/back-button";

import { PoolPinButton } from "../../_components/pool-pin-button";
import { PoolStatusBadge } from "../../_components/pool-status-badge";
import { poolTitle } from "../../_services/pool-title";
import type { PoolBoard } from "../../_types/pool-board";

interface PoolHeaderProps {
  pool: PoolBoard;
  poolingPath: string;
}

export function PoolHeader({ pool, poolingPath }: PoolHeaderProps) {
  const count = pool.fencers.length;

  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <BackButton href={poolingPath}>
          <span className="sr-only">Back to </span>Pooling
        </BackButton>
        <PoolPinButton pool={pool} />
      </div>
      <h1 className="sr-only">{poolTitle(pool)}</h1>
      <div className="flex items-center gap-2.5">
        <PoolStatusBadge status={pool.status} />
        <span aria-hidden className="size-1 rounded-full bg-neutral-muted" />
        <span className="text-sm">
          {count} {count === 1 ? "Fencer" : "Fencers"}
        </span>
      </div>
    </header>
  );
}
