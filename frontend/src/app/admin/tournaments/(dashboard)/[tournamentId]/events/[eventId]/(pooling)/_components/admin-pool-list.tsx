"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ConfirmDeleteModal } from "@/components/primitives/confirm-delete-modal";
import { useToast } from "@/components/primitives/toast";
import type { PoolBoard } from "@/features/pool/types/pool-board";
import { apiRequest } from "@/services/api-request";
import { errorMessage } from "@/utils/error-message";

import { AdminPoolCard } from "./admin-pool-card";
import { EditPoolDialog } from "./edit-pool-dialog";

interface AdminPoolListProps {
  pools: PoolBoard[];
  editing: boolean;
  poolsPath: string;
  tournamentId: string;
  eventId: string;
  maxFencers: number;
}

function AdminPoolList({ pools, editing, poolsPath, tournamentId, eventId, maxFencers }: AdminPoolListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [poolToDelete, setPoolToDelete] = useState<PoolBoard | null>(null);
  const [poolToEdit, setPoolToEdit] = useState<PoolBoard | null>(null);
  const [pending, startTransition] = useTransition();
  const sorted = pools.toSorted((a, b) => a.number - b.number);

  function confirmDelete() {
    if (!poolToDelete) {
      return;
    }
    const { id } = poolToDelete;
    startTransition(async () => {
      try {
        await apiRequest(`/pools/${encodeURIComponent(id)}`, { method: "DELETE" });
        toast({ description: "Pool deleted" });
        router.refresh();
        setPoolToDelete(null);
      } catch (err) {
        toast({ description: errorMessage(err) });
      }
    });
  }

  const otherFencerIds = pools
    .filter((pool) => pool.id !== poolToEdit?.id)
    .flatMap((pool) => pool.fencers.map((fencer) => fencer.competitor_id));

  return (
    <>
      <ul className="flex flex-col gap-4">
        {sorted.map((pool) => (
          <li key={pool.id}>
            <AdminPoolCard
              pool={pool}
              editing={editing}
              poolsPath={poolsPath}
              onEdit={setPoolToEdit}
              onDelete={setPoolToDelete}
            />
          </li>
        ))}
      </ul>
      <ConfirmDeleteModal
        open={poolToDelete !== null}
        onOpenChange={(open) => !open && setPoolToDelete(null)}
        title="Delete Pool?"
        pending={pending}
        onConfirm={confirmDelete}
      />
      <EditPoolDialog
        pool={poolToEdit}
        onOpenChange={(open) => !open && setPoolToEdit(null)}
        tournamentId={tournamentId}
        eventId={eventId}
        maxFencers={maxFencers}
        excludedIds={otherFencerIds}
      />
    </>
  );
}

export { AdminPoolList };
