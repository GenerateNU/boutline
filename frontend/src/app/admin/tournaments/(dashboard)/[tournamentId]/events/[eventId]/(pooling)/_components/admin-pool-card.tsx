import Link from "next/link";

import { Button } from "@/components/primitives/button";
import { Card, CardHeader, CardTitle } from "@/components/primitives/card";
import { Tag } from "@/components/primitives/tag";
import { PoolStatusBadge } from "@/features/pool/components/pool-status-badge";
import { fencerName } from "@/features/pool/lib/fencer-name";
import { fencersByPosition } from "@/features/pool/lib/fencers-by-position";
import { poolStripTitle } from "@/features/pool/lib/pool-strip";
import type { PoolBoard } from "@/features/pool/types/pool-board";

import { DeleteIconButton } from "../../_components/delete-icon-button";

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
            <DeleteIconButton label="Delete pool" disabledReason={pool.status === "upcoming" ? undefined : "Started pools can't be deleted"} onClick={() => onDelete(pool)} />
          ) : (
            <PoolStatusBadge status={pool.status} />
          )}
        </CardHeader>
        <ul className="flex flex-wrap gap-x-3 gap-y-2">
          {fencersByPosition(pool).map((fencer) => (
            <li key={fencer.competitor_id}>
              <Tag className="rounded-full bg-blue-lighter px-2 font-normal text-blue-dark">{fencerName(fencer)}</Tag>
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
