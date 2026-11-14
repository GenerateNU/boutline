"use client";

import CheckOutlined from "@mui/icons-material/CheckOutlined";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import { useState } from "react";

import { Button } from "@/components/primitives/button";

import { FencerDraft } from "../_types/tournament-draft";
import { FENCER_FIELD_LABELS, formatRating, missingFencerFields } from "../tournament-draft-helpers";
import { FencerDraftFields } from "./fencer-draft-fields";

// The parser accepts a row with only a member number, so the name can be blank.
function fencerName({ firstName, lastName, memberNumber }: FencerDraft) {
  return [lastName, firstName].filter(Boolean).join(", ") || (memberNumber ? `Member #${memberNumber}` : "New fencer");
}

interface FencerDraftCardProps {
  fencer: FencerDraft;
  editable: boolean;
  onChange: (patch: Partial<FencerDraft>) => void;
  onRemove: () => void;
}

function FencerDraftCard({ fencer, editable, onChange, onRemove }: FencerDraftCardProps) {
  // A fencer added by hand starts blank, so it opens ready to fill in.
  const [editing, setEditing] = useState(fencer.firstName === "" && fencer.lastName === "");
  const name = fencerName(fencer);
  const missing = missingFencerFields(fencer);
  const details = [fencer.club || "Unattached", formatRating(fencer), fencer.memberNumber && `#${fencer.memberNumber}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <li role="group" aria-label={name} className="flex flex-col gap-3 rounded-md border border-outline p-3">
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium text-obsidian">{name}</span>
          <span className="truncate text-xs text-neutral-secondary">{details}</span>
          {missing.length > 0 ? (
            <span className="text-xs text-red-dark">
              Missing {missing.map((field) => FENCER_FIELD_LABELS[field]).join(", ")}
            </span>
          ) : null}
        </div>
        {editable ? (
          <>
            <Button
              type="button"
              variant="text"
              size="icon"
              aria-label={editing ? `Done editing ${name}` : `Edit ${name}`}
              onClick={() => setEditing(!editing)}
              className="-my-2 text-neutral-secondary [&_svg]:size-5"
            >
              {editing ? <CheckOutlined aria-hidden /> : <EditOutlined aria-hidden />}
            </Button>
            <Button
              type="button"
              variant="text"
              size="icon"
              aria-label={`Remove ${name}`}
              onClick={onRemove}
              className="-my-2 -mr-2 text-neutral-secondary [&_svg]:size-5"
            >
              <DeleteOutlined aria-hidden />
            </Button>
          </>
        ) : null}
      </div>
      {editable && editing ? <FencerDraftFields fencer={fencer} onChange={onChange} /> : null}
    </li>
  );
}

export { FencerDraftCard };
