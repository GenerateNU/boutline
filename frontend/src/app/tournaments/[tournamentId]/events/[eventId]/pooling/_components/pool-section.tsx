import { useId } from "react";

import type { PoolBoard } from "../_types/pool-board";

import { PoolCard } from "./pool-card";

interface PoolSectionProps {
  title: string;
  pools: PoolBoard[];
  poolingPath: string;
  emptyMessage?: string;
}

export function PoolSection({ title, pools, poolingPath, emptyMessage }: PoolSectionProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="text-base font-medium">
        {title}
      </h2>
      {pools.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {pools.map((pool) => (
            <li key={pool.id}>
              <PoolCard pool={pool} poolingPath={poolingPath} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      )}
    </section>
  );
}
