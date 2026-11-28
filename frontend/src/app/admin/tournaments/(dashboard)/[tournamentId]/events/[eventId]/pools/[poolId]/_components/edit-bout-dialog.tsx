"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/primitives/button";
import { Modal, ModalFooter } from "@/components/primitives/modal";
import { SelectField } from "@/components/primitives/select-field";
import { TextField } from "@/components/primitives/text-field";
import { useToast } from "@/components/primitives/toast";
import { fencerName } from "@/features/pool/lib/fencer-name";
import { poolStatusLabels } from "@/features/pool/lib/pool-status-labels";
import type { PoolBoard, PoolBout } from "@/features/pool/types/pool-board";
import { apiRequest } from "@/services/api-request";
import { errorMessage } from "@/utils/error-message";

interface EditBoutDialogProps {
  bout: PoolBout;
  pool: PoolBoard;
  onOpenChange: (open: boolean) => void;
}

export function EditBoutDialog({ bout, pool, onOpenChange }: EditBoutDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [first, setFirst] = useState(bout.competitor_1_id);
  const [second, setSecond] = useState(bout.competitor_2_id);
  const [pending, startTransition] = useTransition();
  const options = pool.fencers.map((fencer) => ({ value: fencer.competitor_id, label: fencerName(fencer) }));

  function save(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await apiRequest(`/bouts/${bout.id}`, {
          method: "PATCH",
          body: JSON.stringify({ competitor_1_id: first, competitor_2_id: second }),
        });
        toast({ description: "Bout updated" });
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        toast({ description: errorMessage(err) });
      }
    });
  }

  return (
    <Modal open onOpenChange={onOpenChange} title="Edit Bout Information">
      <form className="flex flex-col gap-5" onSubmit={save}>
        {/* The bout number and status are shown, not edited: the backend sets both. */}
        <TextField label="Bout Number" readOnly value={String(bout.slot)} />
        <SelectField label="Player 1" options={options} value={first} onValueChange={setFirst} />
        <SelectField label="Player 2" options={options} value={second} onValueChange={setSecond} />
        <TextField label="Status" readOnly value={poolStatusLabels[bout.status]} />
        <ModalFooter>
          <Button type="submit" disabled={pending || first === second}>
            Confirm edits
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
