import DeleteIcon from "@mui/icons-material/Delete";
import Link from "next/link";

import { Button } from "@/components/primitives/button";
import { Card, CardHeader, CardTitle } from "@/components/primitives/card";
import { Tag } from "@/components/primitives/tag";
import { PoolStatusBadge } from "@/features/pool/components/pool-status-badge";
import { fencerName } from "@/features/pool/lib/fencer-name";
import { poolStripTitle } from "@/features/pool/lib/pool-strip";
import type { PoolBoard } from "@/features/pool/types/pool-board";

interface AdminPoolCardProps {
  pool: PoolBoard;
  editing: boolean;
  poolsPath: string;
  onEdit: (pool: PoolBoard) => void;
  onDelete: (pool: PoolBoard) => void;
}

function AdminPoolCard({ pool, editing, poolsPath, onEdit, onDelete }: AdminPoolCardProps) {
  return (
    <Card className="font-manrope">
      <div className="flex flex-col gap-3">
        <CardHeader className="flex items-start justify-between gap-2">
          <CardTitle className="font-satoshi text-xl leading-6 font-medium text-charcoal">
            {poolStripTitle(pool)}
          </CardTitle>
          {editing ? (
            <button
              type="button"
              aria-label="Delete pool"
              title={pool.status === "upcoming" ? undefined : "Started pools can't be deleted"}
              disabled={pool.status !== "upcoming"}
              onClick={() => onDelete(pool)}
              className="-m-1 shrink-0 cursor-pointer rounded-md p-1 text-red-dark outline-none hover:bg-red-light focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:text-disabled-foreground disabled:hover:bg-transparent"
            >
              <DeleteIcon aria-hidden className="size-6" />
            </button>
          ) : (
            <PoolStatusBadge status={pool.status} />
          )}
        </CardHeader>
        <ul className="flex flex-wrap gap-x-3 gap-y-2">
          {[...pool.fencers]
            .sort((a, b) => a.position - b.position)
            .map((fencer) => (
              <li key={fencer.competitor_id}>
                <Tag className="rounded-full bg-blue-lighter px-2 font-normal text-blue-dark">
                  {fencerName(fencer)}
                </Tag>
              </li>
            ))}
        </ul>
      </div>
      {editing ? (
        <Button variant="outline" size="sm" onClick={() => onEdit(pool)}>
          Edit Pool
        </Button>
      ) : (
        <Button asChild variant="outline" size="sm">
          <Link href={`${poolsPath}/${pool.id}`}>View Pool</Link>
        </Button>
      )}
    </Card>
  );
}

export { AdminPoolCard };
