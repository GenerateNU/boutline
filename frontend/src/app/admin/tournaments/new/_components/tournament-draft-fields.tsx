"use client";

import { useState } from "react";

import { Button } from "@/components/primitives/button";
import { SelectField } from "@/components/primitives/select-field";
import { TextField } from "@/components/primitives/text-field";

import { TournamentDraft } from "../_types/tournament-draft";
import { missingTournamentFields, RequiredTournamentField } from "../tournament-draft-helpers";

const AUTHORITIES = ["askFRED", "USA Fencing", "FIE", "Other"];

interface TournamentDraftFieldsProps {
  draft: TournamentDraft;
  onField: (field: RequiredTournamentField, value: string) => void;
  onSave: () => void;
}

function TournamentDraftFields({ draft, onField, onSave }: TournamentDraftFieldsProps) {
  const [attempted, setAttempted] = useState(false);
  // Recomputed from the draft, so a field turns back to normal once it's filled.
  const invalid = new Set<RequiredTournamentField>(attempted ? missingTournamentFields(draft) : []);

  function handleSave() {
    if (missingTournamentFields(draft).length > 0) {
      setAttempted(true);
      return;
    }
    onSave();
  }

  return (
    <>
      <TextField
        label="Name of tournament"
        placeholder="Northeastern Open"
        value={draft.name}
        aria-invalid={invalid.has("name")}
        onChange={(change) => onField("name", change.target.value)}
        required
      />
      <TextField
        label="Location"
        placeholder="City, State"
        value={draft.location}
        aria-invalid={invalid.has("location")}
        onChange={(change) => onField("location", change.target.value)}
        required
      />
      <TextField
        label="Venue"
        placeholder="Cabot Center"
        value={draft.venue}
        aria-invalid={invalid.has("venue")}
        onChange={(change) => onField("venue", change.target.value)}
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Date"
          type="date"
          value={draft.date}
          aria-invalid={invalid.has("date")}
          onChange={(change) => onField("date", change.target.value)}
          required
        />
        <TextField
          label="Time"
          type="time"
          value={draft.time}
          aria-invalid={invalid.has("time")}
          onChange={(change) => onField("time", change.target.value)}
          required
        />
      </div>
      <SelectField
        label="Authority"
        options={AUTHORITIES}
        value={draft.authority}
        aria-invalid={invalid.has("authority")}
        onValueChange={(authority) => onField("authority", authority)}
        required
      />

      {invalid.size > 0 ? (
        <p role="alert" className="text-xs text-red-dark">
          Fill in the highlighted fields to save the tournament.
        </p>
      ) : null}
      <Button type="button" variant="tonal" className="h-10 rounded-full" onClick={handleSave}>
        Save tournament
      </Button>
    </>
  );
}

export { TournamentDraftFields };
