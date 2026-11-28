import Link from "next/link";
import { useId } from "react";
import { cn } from "cn";

import { MockCountry } from "@/app/tournaments/[tournamentId]/_components/mock-country";
import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { Text } from "@/components/primitives/text";
import { PoolStatusBadge } from "@/features/pool/components/pool-status-badge";
import type { PoolBoutDetail, PoolBoutSide } from "@/features/pool/types/pool-bout-detail";

import { DeleteIconButton } from "../../../_components/delete-icon-button";

interface AdminBoutCardProps {
  detail: PoolBoutDetail;
  editing: boolean;
  refereeBasePath: string;
  onEdit: () => void;
  onDelete: () => void;
  onAuditLog: () => void;
}

function FencerRow({ side }: { side: PoolBoutSide }) {
  const won = side.result === "V";

  return (
    <div className={cn("flex items-center gap-3 rounded-md p-3", won ? "bg-green-light" : "bg-surface")}>
      <div
        className={cn(
          "flex size-6 items-center justify-center rounded-[4px] text-xs font-semibold text-white",
          won ? "bg-green" : "bg-neutral-muted",
        )}
      >
        {side.position}
      </div>
      <div className="min-w-0 flex-1">
        <Text variant="subtitle" className="truncate">
          {side.name}
        </Text>
        <Text variant="caption" className="truncate">
          <MockCountry /> · {side.team || "No club"}
        </Text>
      </div>
      <div className={cn("text-xl font-semibold", won ? "text-green-dark" : "text-neutral-secondary")}>
        {side.score ?? "–"}
      </div>
    </div>
  );
}

export function AdminBoutCard({
  detail,
  editing,
  refereeBasePath,
  onEdit,
  onDelete,
  onAuditLog,
}: AdminBoutCardProps) {
  const headingId = useId();
  const refereeHref = `${refereeBasePath}/${detail.id}/referee`;

  return (
    <Card role="region" aria-labelledby={headingId} className="gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase text-neutral-secondary">
            Bout {detail.number} of {detail.total}
          </p>
          <Text as="h2" variant="title" id={headingId}>
            Pool bout
          </Text>
        </div>
        {editing ? (
          <DeleteIconButton label="Delete" disabledReason={detail.status === "active" ? "A bout in progress can't be deleted" : undefined} onClick={onDelete} />
        ) : (
          <PoolStatusBadge status={detail.status} />
        )}
      </div>
      {detail.sides.map((side) => (
        <FencerRow key={side.competitorId} side={side} />
      ))}
      {editing ? (
        // The backend only re-pairs a bout that hasn't started.
        <Button type="button" size="sm" disabled={detail.status !== "upcoming"} onClick={onEdit}>
          Edit Info
        </Button>
      ) : detail.status === "ended" ? (
        <Button type="button" size="sm" onClick={onAuditLog}>
          View Audit Log
        </Button>
      ) : (
        <Button asChild size="sm">
          <Link href={refereeHref}>{detail.status === "active" ? "Continue Match" : "Start Match"}</Link>
        </Button>
      )}
    </Card>
  );
}
