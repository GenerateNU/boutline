"use client";

import { useId } from "react";

import { DateField } from "@/components/primitives/date-field";
import { SelectField } from "@/components/primitives/select-field";
import { TextField } from "@/components/primitives/text-field";
import { TimeField } from "@/components/primitives/time-field";
import { formatDateParam, parseDateParam } from "@/features/tournament/lib/date-param";

import { TournamentDraft } from "../_types/tournament-draft";
import { missingTournamentFields, RequiredTournamentField } from "../tournament-draft-helpers";
import { AUTHORITIES } from "../tournament-request-helpers";

interface TournamentDraftFieldsProps {
  draft: TournamentDraft;
  onField: (field: RequiredTournamentField, value: string) => void;
  // True once Continue has failed, so empty fields stay marked from then on.
  attempted: boolean;
}

function TournamentDraftFields({ draft, onField, attempted }: TournamentDraftFieldsProps) {
  // Recomputed from the draft, so a field turns back to normal once it's filled.
  const invalid = new Set<RequiredTournamentField>(attempted ? missingTournamentFields(draft) : []);
  const errorId = useId();

  // Marks an empty field and points it at the error, so a screen reader reads why.
  function invalidProps(field: RequiredTournamentField) {
    return invalid.has(field) ? { "aria-invalid": true, "aria-describedby": errorId } : {};
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <TextField
        label="Name of Tournament"
        placeholder="ex. Boston Boutline Open"
        value={draft.name}
        {...invalidProps("name")}
        onChange={(change) => onField("name", change.target.value)}
        required
      />
      <TextField
        label="Location"
        placeholder="ex. Boston, MA"
        value={draft.location}
        {...invalidProps("location")}
        onChange={(change) => onField("location", change.target.value)}
        required
      />
      <TextField
        label="Venue"
        placeholder="ex. Matthews Center"
        value={draft.venue}
        {...invalidProps("venue")}
        onChange={(change) => onField("venue", change.target.value)}
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <DateField
          label="Date"
          value={parseDateParam(draft.date)}
          {...invalidProps("date")}
          onValueChange={(date) => onField("date", formatDateParam(date))}
          required
        />
        <TimeField
          label="Time"
          value={draft.time}
          {...invalidProps("time")}
          onValueChange={(time) => onField("time", time)}
          required
        />
      </div>
      <SelectField
        label="Authority"
        options={AUTHORITIES}
        value={draft.authority}
        {...invalidProps("authority")}
        onValueChange={(authority) => onField("authority", authority)}
        required
      />

      {invalid.size > 0 ? (
        <p id={errorId} role="alert" className="text-xs text-red-dark">
          Fill in the highlighted fields to create the tournament.
        </p>
      ) : null}
    </div>
  );
}

export { TournamentDraftFields };
