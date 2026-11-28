"use client";

import { useEffect, useState } from "react";

import { Modal } from "@/components/primitives/modal";
import { Skeleton } from "@/components/primitives/skeleton";
import { Text } from "@/components/primitives/text";
import { fencerName } from "@/features/pool/lib/fencer-name";
import type { PoolBoard, PoolBout } from "@/features/pool/types/pool-board";
import { apiRequest } from "@/services/api-request";
import type { ScoringHistoryEntry, ScoringHistoryResponse } from "@/types/scoring";
import { errorMessage } from "@/utils/error-message";

interface BoutAuditLogDialogProps {
  bout: PoolBout;
  pool: PoolBoard;
  onOpenChange: (open: boolean) => void;
}

type HistoryState =
  | { status: "loading" }
  | { status: "failed"; message: string }
  | { status: "loaded"; entries: ScoringHistoryEntry[] };

export function BoutAuditLogDialog({ bout, pool, onOpenChange }: BoutAuditLogDialogProps) {
  const [history, setHistory] = useState<HistoryState>({ status: "loading" });

  useEffect(() => {
    let ignore = false;
    apiRequest<ScoringHistoryResponse>(`/scoring/match/${bout.id}/history`)
      .then(({ data }) => !ignore && setHistory({ status: "loaded", entries: data }))
      .catch((err) => !ignore && setHistory({ status: "failed", message: errorMessage(err) }));
    return () => {
      ignore = true;
    };
  }, [bout.id]);

  function scorerName(competitorId: string) {
    const fencer = pool.fencers.find((f) => f.competitor_id === competitorId);
    return fencer ? fencerName(fencer).toUpperCase() : "UNKNOWN";
  }

  return (
    <Modal open onOpenChange={onOpenChange} title="Audit Log">
      {history.status === "loading" && (
        <div className="flex flex-col gap-2">
          <p role="status" className="sr-only">
            Loading audit log
          </p>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}
      {history.status === "failed" && (
        <p role="alert" className="text-sm text-red-dark">
          {history.message}
        </p>
      )}
      {history.status === "loaded" &&
        (history.entries.length === 0 ? (
          <Text variant="muted">No touches recorded.</Text>
        ) : (
          <ul className="flex max-h-80 flex-col divide-y divide-outline overflow-y-auto">
            {history.entries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-2">
                <div className="flex flex-col">
                  <Text variant="caption">{new Date(entry.created_at).toLocaleTimeString("en-US")}</Text>
                  <Text>Touch {scorerName(entry.competitor_id)}</Text>
                  {entry.revoked_at && <p className="text-xs text-neutral-muted">Revoked</p>}
                </div>
                <Text variant="subtitle">
                  {entry.competitor_1_score} - {entry.competitor_2_score}
                </Text>
              </li>
            ))}
          </ul>
        ))}
    </Modal>
  );
}
