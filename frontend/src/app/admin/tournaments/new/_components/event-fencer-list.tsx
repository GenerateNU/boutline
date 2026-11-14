"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";
import { useState } from "react";

import { Button } from "@/components/primitives/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/primitives/collapsible";
import { pluralize } from "@/lib/pluralize";

import { FencerDraft } from "../_types/tournament-draft";
import { missingFencerFields } from "../tournament-draft-helpers";
import { FencerDraftCard } from "./fencer-draft-card";

interface AddFencerButtonProps {
  onClick: () => void;
}

function AddFencerButton({ onClick }: AddFencerButtonProps) {
  return (
    <Button type="button" variant="outline" size="sm" className="self-start rounded-full" onClick={onClick}>
      <AddOutlined aria-hidden />
      Add fencer
    </Button>
  );
}

interface EventFencerListProps {
  fencers: FencerDraft[];
  editable: boolean;
  // True once the event's Save has failed, so incomplete fencers are shown.
  showErrors: boolean;
  onAdd: () => void;
  onChange: (fencerId: string, patch: Partial<FencerDraft>) => void;
  onRemove: (fencerId: string) => void;
}

function EventFencerList({ fencers, editable, showErrors, onAdd, onChange, onRemove }: EventFencerListProps) {
  const [open, setOpen] = useState(false);
  // Stays open while a fencer is blocking the save, so the admin can see which.
  const isBlockingSave = showErrors && fencers.some((fencer) => missingFencerFields(fencer).length > 0);

  // Opens the list too, so a fencer added by hand is visible to fill in.
  function handleAdd() {
    setOpen(true);
    onAdd();
  }

  if (fencers.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-neutral-secondary">No fencers yet. Upload a CSV above or add one by hand.</p>
        {editable ? <AddFencerButton onClick={handleAdd} /> : null}
      </div>
    );
  }

  return (
    <Collapsible open={open || isBlockingSave} onOpenChange={setOpen} className="rounded-md border border-outline">
      <CollapsibleTrigger className="group/fencers flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-obsidian outline-none focus-visible:ring-3 focus-visible:ring-blue-lighter">
        {fencers.length} {pluralize(fencers.length, "fencer")}
        <ExpandMoreOutlined
          aria-hidden
          className="size-4 text-neutral-secondary transition-transform group-data-[state=open]/fencers:rotate-180"
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-3 border-t border-outline p-3">
          <ul className="flex flex-col gap-2">
            {fencers.map((fencer) => (
              <FencerDraftCard
                key={fencer.id}
                fencer={fencer}
                editable={editable}
                showErrors={showErrors}
                onChange={(patch) => onChange(fencer.id, patch)}
                onRemove={() => onRemove(fencer.id)}
              />
            ))}
          </ul>
          {editable ? <AddFencerButton onClick={handleAdd} /> : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export { EventFencerList };
