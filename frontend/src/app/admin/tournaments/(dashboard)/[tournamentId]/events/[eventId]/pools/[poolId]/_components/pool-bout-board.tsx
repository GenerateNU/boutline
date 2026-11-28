"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ConfirmDeleteModal } from "@/components/primitives/confirm-delete-modal";
import { SearchBar } from "@/components/primitives/search-bar";
import { Text } from "@/components/primitives/text";
import { useToast } from "@/components/primitives/toast";
import { poolBoutDetail } from "@/features/pool/lib/pool-bout-detail";
import type { PoolBoard, PoolStatus } from "@/features/pool/types/pool-board";
import { apiRequest } from "@/services/api-request";
import { errorMessage } from "@/utils/error-message";

import { filterBouts } from "../_services/filter-bouts";

import { AdminBoutCard } from "./admin-bout-card";
import { EditModeLink } from "../../../_components/edit-mode-link";
import { BoutAuditLogDialog } from "./bout-audit-log-dialog";
import { BoutStatusFilterSheet } from "./bout-status-filter-sheet";
import { EditBoutDialog } from "./edit-bout-dialog";

interface PoolBoutBoardProps {
  pool: PoolBoard;
  editing: boolean;
  canManage: boolean;
  poolPath: string;
  refereeBasePath: string;
}

export function PoolBoutBoard({ pool, editing, canManage, poolPath, refereeBasePath }: PoolBoutBoardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statuses, setStatuses] = useState<PoolStatus[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bouts = filterBouts(pool, search, statuses);
  const editBout = pool.bouts.find((bout) => bout.id === editId) ?? null;
  const auditBout = pool.bouts.find((bout) => bout.id === auditId) ?? null;

  function deleteBout() {
    startTransition(async () => {
      try {
        await apiRequest(`/bouts/${encodeURIComponent(String(deleteId))}`, { method: "DELETE" });
        toast({ description: "Bout deleted" });
        setDeleteId(null);
        router.refresh();
      } catch (err) {
        toast({ description: errorMessage(err) });
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <SearchBar
          className="flex-1"
          placeholder="Search fencers and clubs"
          aria-label="Search fencers"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <BoutStatusFilterSheet statuses={statuses} onApply={setStatuses} />
      </div>
      {canManage && (
        <EditModeLink editing={editing} path={poolPath} className="self-start" />
      )}
      {bouts.length > 0 ? (
        bouts.map((bout) => {
          const detail = poolBoutDetail(pool, bout.id);
          return (
            detail && (
              <AdminBoutCard
                key={bout.id}
                detail={detail}
                editing={editing}
                refereeBasePath={refereeBasePath}
                onEdit={() => setEditId(bout.id)}
                onDelete={() => setDeleteId(bout.id)}
                onAuditLog={() => setAuditId(bout.id)}
              />
            )
          );
        })
      ) : (
        <Text variant="muted">No bouts match your search or filters.</Text>
      )}
      <ConfirmDeleteModal
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Bout?"
        pending={pending}
        onConfirm={deleteBout}
      />
      {editBout && <EditBoutDialog bout={editBout} pool={pool} onOpenChange={(open) => !open && setEditId(null)} />}
      {auditBout && (
        <BoutAuditLogDialog bout={auditBout} pool={pool} onOpenChange={(open) => !open && setAuditId(null)} />
      )}
    </div>
  );
}
