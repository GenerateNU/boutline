import { BackButton } from "@/components/primitives/back-button";
import type { PinnedEvent } from "@/features/pinning/types/pinning";

import { PoolPinButton } from "../../_components/pool-pin-button";
import { PoolStatusBadge } from "@/features/pool/components/pool-status-badge";
import { poolTitle } from "../../_services/pool-title";
import type { PoolBoard } from "@/features/pool/types/pool-board";

interface PoolHeaderProps {
  pool: PoolBoard;
  poolingPath: string;
  event: PinnedEvent;
}

export function PoolHeader({ pool, poolingPath, event }: PoolHeaderProps) {
  const count = pool.fencers.length;

  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <BackButton href={poolingPath}>
          <span className="sr-only">Back to </span>Pooling
        </BackButton>
        <PoolPinButton pool={pool} event={event} />
      </div>
      <h2 className="sr-only">{poolTitle(pool)}</h2>
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
