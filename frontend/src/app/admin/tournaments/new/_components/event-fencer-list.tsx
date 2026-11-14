"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";
import { useState } from "react";

import { Button } from "@/components/primitives/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/primitives/collapsible";
import { pluralize } from "@/lib/pluralize";

import { FencerDraft } from "../_types/tournament-draft";
import { FencerDraftCard } from "./fencer-draft-card";

interface EventFencerListProps {
  fencers: FencerDraft[];
  // Fencers change only while their event is being edited, not once it's saved.
  editable: boolean;
  onAdd: () => void;
  onChange: (fencerId: string, patch: Partial<FencerDraft>) => void;
  onRemove: (fencerId: string) => void;
}

function EventFencerList({ fencers, editable, onAdd, onChange, onRemove }: EventFencerListProps) {
  const [open, setOpen] = useState(false);

  // Opens the list too, so a fencer added by hand is visible to fill in.
  function handleAdd() {
    setOpen(true);
    onAdd();
  }

  const addButton = editable ? (
    <Button type="button" variant="outline" size="sm" className="self-start rounded-full" onClick={handleAdd}>
      <AddOutlined aria-hidden />
      Add fencer
    </Button>
  ) : null;

  if (fencers.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-neutral-secondary">No fencers yet. Upload a CSV above or add one by hand.</p>
        {addButton}
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border border-outline">
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
                onChange={(patch) => onChange(fencer.id, patch)}
                onRemove={() => onRemove(fencer.id)}
              />
            ))}
          </ul>
          {addButton}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export { EventFencerList };
