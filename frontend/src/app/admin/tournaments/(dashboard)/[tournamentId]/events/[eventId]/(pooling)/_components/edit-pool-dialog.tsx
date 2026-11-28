"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/primitives/button";
import { Modal, ModalFooter } from "@/components/primitives/modal";
import { TextField } from "@/components/primitives/text-field";
import { useToast } from "@/components/primitives/toast";
import { fencerName } from "@/features/pool/lib/fencer-name";
import { fencersByPosition } from "@/features/pool/lib/fencers-by-position";
import { stripBody, stripNumber } from "@/features/pool/lib/pool-strip";
import { isValidPool } from "@/features/pool/lib/pool-limits";
import { poolStatusLabels } from "@/features/pool/lib/pool-status-labels";
import type { PoolBoard } from "@/features/pool/types/pool-board";
import { apiRequest } from "@/services/api-request";
import { errorMessage } from "@/utils/error-message";

import { type PickedFencer, PoolFencerField } from "./pool-fencer-field";
import { EMD_FORM_FIELDS } from "../../_components/emd-form-fields";

function poolFencers(pool: PoolBoard): PickedFencer[] {
  return fencersByPosition(pool).map((fencer) => ({ id: fencer.competitor_id, name: fencerName(fencer) }));
}

interface EditPoolFormProps extends Omit<EditPoolDialogProps, "pool"> {
  pool: PoolBoard;
}

// Mounted only while a pool is being edited, so the fields start from that pool.
function EditPoolForm({ pool, onOpenChange, tournamentId, eventId, maxFencers, excludedIds }: EditPoolFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [number, setNumber] = useState(String(pool.number));
  const [strip, setStrip] = useState(stripNumber(pool.strip));
  const [fencers, setFencers] = useState(() => poolFencers(pool));
  const [pending, startTransition] = useTransition();

  const poolNumber = Number(number);
  const valid = isValidPool(poolNumber, fencers.length, maxFencers);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ids = fencers.map(({ id }) => id);
    const changed = ids.join() !== poolFencers(pool).map(({ id }) => id).join();
    startTransition(async () => {
      try {
        await apiRequest(`/pools/${encodeURIComponent(pool.id)}`, {
          method: "PATCH",
          body: JSON.stringify({ number: poolNumber, strip: stripBody(strip) ?? "", ...(changed && { fencers: ids }) }),
        });
        toast({ description: "Pool updated" });
        router.refresh();
        onOpenChange(false);
      } catch (err) {
        toast({ description: errorMessage(err) });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className={EMD_FORM_FIELDS}>
      <PoolFencerField
        fencers={fencers}
        onChange={setFencers}
        tournamentId={tournamentId}
        eventId={eventId}
        excludedIds={excludedIds}
      />
      <TextField
        label="Number"
        type="number"
        min={1}
        value={number}
        onChange={(event) => setNumber(event.target.value)}
      />
      <TextField
        label="Strip"
        placeholder="ex. 1, 2, 3, 4"
        value={strip}
        onChange={(event) => setStrip(event.target.value)}
      />
      <TextField label="Status" readOnly value={poolStatusLabels[pool.status]} className="[&_input]:text-neutral-secondary" />
      <ModalFooter>
        <Button type="submit" disabled={!valid || pending}>
          Confirm edits
        </Button>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      </ModalFooter>
    </form>
  );
}

interface EditPoolDialogProps {
  pool: PoolBoard | null;
  onOpenChange: (open: boolean) => void;
  tournamentId: string;
  eventId: string;
  maxFencers: number;
  excludedIds: string[];
}

function EditPoolDialog({ pool, onOpenChange, ...props }: EditPoolDialogProps) {
  return (
    <Modal open={pool !== null} onOpenChange={onOpenChange} title="Edit Pool Info">
      {pool && <EditPoolForm key={pool.id} pool={pool} onOpenChange={onOpenChange} {...props} />}
    </Modal>
  );
}

export { EditPoolDialog };
