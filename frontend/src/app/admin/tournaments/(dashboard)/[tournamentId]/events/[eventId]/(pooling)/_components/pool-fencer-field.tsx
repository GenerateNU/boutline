"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import { useState } from "react";

import { Chip } from "@/components/primitives/chip";
import { Text } from "@/components/primitives/text";

import { PoolFencerPicker } from "./pool-fencer-picker";

interface PickedFencer {
  id: string;
  name: string;
}

interface PoolFencerFieldProps {
  fencers: PickedFencer[];
  onChange: (fencers: PickedFencer[]) => void;
  tournamentId: string;
  eventId: string;
  excludedIds: string[];
}

function PoolFencerField({ fencers, onChange, tournamentId, eventId, excludedIds }: PoolFencerFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <Text>Fencers</Text>
      <div className="flex flex-wrap gap-x-3 gap-y-2">
        {fencers.map(({ id, name }) => (
          <Chip
            key={id}
            onDismiss={() => onChange(fencers.filter((fencer) => fencer.id !== id))}
            dismissLabel={`Remove ${name}`}
            className="gap-2.5 rounded-full border-transparent bg-blue-lighter px-2 font-normal text-blue-dark shadow-none hover:bg-blue-light"
          >
            {name}
          </Chip>
        ))}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex cursor-pointer items-center gap-0.5 rounded-full bg-blue-dark px-2 py-1 text-xs text-blue-lightest outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5"
        >
          <AddOutlined aria-hidden />
          Add fencer
        </button>
      </div>
      <PoolFencerPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        tournamentId={tournamentId}
        eventId={eventId}
        excludedIds={excludedIds}
        selected={fencers}
        onConfirm={onChange}
      />
    </div>
  );
}

export { PoolFencerField };
export type { PickedFencer };
