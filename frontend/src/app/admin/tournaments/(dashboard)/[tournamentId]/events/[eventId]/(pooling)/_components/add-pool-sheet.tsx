"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/primitives/button";
import { Sheet } from "@/components/primitives/sheet";
import { Text } from "@/components/primitives/text";
import { TextField } from "@/components/primitives/text-field";
import { useToast } from "@/components/primitives/toast";
import { errorMessage } from "@/utils/error-message";

import { createPool } from "../_services/create-pool";
import { PoolFencerChips, type PickedFencer } from "./pool-fencer-chips";
import { PoolFencerPicker } from "./pool-fencer-picker";
import { EMD_FORM_FIELDS } from "../../_components/emd-form-fields";

const MIN_FENCERS = 4;

interface AddPoolSheetProps {
  tournamentId: string;
  eventId: string;
  poolStageId: string | null;
  maxFencers: number;
  nextNumber: number;
  excludedIds: string[];
  disabled?: boolean;
}

function AddPoolSheet({
  tournamentId,
  eventId,
  poolStageId,
  maxFencers,
  nextNumber,
  excludedIds,
  disabled,
}: AddPoolSheetProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [number, setNumber] = useState(String(nextNumber));
  const [strip, setStrip] = useState("");
  const [fencers, setFencers] = useState<PickedFencer[]>([]);
  const [pending, startTransition] = useTransition();

  const poolNumber = Number(number);
  const valid =
    fencers.length >= MIN_FENCERS && fencers.length <= maxFencers && Number.isInteger(poolNumber) && poolNumber >= 1;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setNumber(String(nextNumber));
      setStrip("");
      setFencers([]);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await createPool({ eventId, poolStageId, number: poolNumber, strip, fencerIds: fencers.map(({ id }) => id) });
        toast({ description: `Pool ${poolNumber} added` });
        router.refresh();
        setOpen(false);
      } catch (err) {
        toast({ description: errorMessage(err) });
      }
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Add Pools"
      description="Set the pool number, strip and fencers."
      trigger={
        <Button size="sm" disabled={disabled}>
          Add Pools
        </Button>
      }
    >
      <form onSubmit={handleSubmit} className={EMD_FORM_FIELDS}>
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
        <div className="flex flex-col gap-2">
          <Text>Fencers</Text>
          <PoolFencerChips
            fencers={fencers}
            onRemove={(id) => setFencers(fencers.filter((fencer) => fencer.id !== id))}
            onAdd={() => setPickerOpen(true)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={!valid || pending}>
          Add Pool
        </Button>
      </form>
      <PoolFencerPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        tournamentId={tournamentId}
        eventId={eventId}
        excludedIds={excludedIds}
        selected={fencers}
        onConfirm={setFencers}
      />
    </Sheet>
  );
}

export { AddPoolSheet };
