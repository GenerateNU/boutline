"use client";

import { useId } from "react";

import { ChipGroup, ChipGroupOptions } from "@/components/primitives/chip-group";
import { DateField } from "@/components/primitives/date-field";
import { SelectField } from "@/components/primitives/select-field";
import { TextField } from "@/components/primitives/text-field";
import { TimeField } from "@/components/primitives/time-field";
import { formatDateParam, parseDateParam } from "@/features/tournament/lib/date-param";

import { EventDraft } from "../_types/tournament-draft";
import { EVENT_FORMATS, EVENT_TYPES, missingEventFields, RequiredEventField } from "../tournament-draft-helpers";
import {
  AGE_CATEGORIES,
  GENDER_MIXES,
  QUALIFIER_OPTIONS,
  RATING_LEVELS,
  WEAPONS,
} from "../tournament-request-helpers";

interface EventDraftFieldsProps {
  event: EventDraft;
  // True once Continue has failed, so empty fields stay marked from then on.
  attempted: boolean;
  onChange: (patch: Partial<EventDraft>) => void;
}

// ChipGroup takes value/label pairs; these option lists are their own labels.
function chipOptions(labels: string[]) {
  return labels.map((label) => ({ value: label, label }));
}

function EventDraftFields({ event, attempted, onChange }: EventDraftFieldsProps) {
  const errorId = useId();
  // Recomputed from the event, so a field turns back to normal once it's filled.
  const invalid = new Set<RequiredEventField>(attempted ? missingEventFields(event) : []);

  // Marks an empty field and points it at the error, so a screen reader reads why.
  function invalidProps(field: RequiredEventField) {
    return invalid.has(field) ? { "aria-invalid": true, "aria-describedby": errorId } : {};
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <TextField
        label="Event name"
        placeholder="Y14 Women's Foil"
        value={event.name}
        {...invalidProps("name")}
        onChange={(change) => onChange({ name: change.target.value })}
        required
      />
      <SelectField
        label="Type of event"
        options={EVENT_TYPES}
        value={event.type}
        {...invalidProps("type")}
        onValueChange={(type) => onChange({ type })}
        required
      />
      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        <DateField
          label="Date"
          value={parseDateParam(event.date)}
          {...invalidProps("date")}
          onValueChange={(date) => onChange({ date: formatDateParam(date) })}
          required
        />
        <TimeField
          label="Time"
          value={event.time}
          {...invalidProps("time")}
          onValueChange={(time) => onChange({ time })}
          required
        />
      </div>
      <ChipGroup
        label="Weapon"
        value={event.weapon}
        onValueChange={(weapon) => weapon && onChange({ weapon })}
        className={invalid.has("weapon") ? "rounded-md ring-2 ring-red-dark" : undefined}
      >
        <ChipGroupOptions options={chipOptions(WEAPONS)} />
      </ChipGroup>
      <ChipGroup
        label="Gender Mix"
        value={event.genderMix}
        onValueChange={(genderMix) => genderMix && onChange({ genderMix })}
        className={invalid.has("genderMix") ? "rounded-md ring-2 ring-red-dark" : undefined}
      >
        <ChipGroupOptions options={chipOptions(GENDER_MIXES)} />
      </ChipGroup>
      <SelectField
        label="Age Category"
        options={AGE_CATEGORIES}
        value={event.ageCategory}
        {...invalidProps("ageCategory")}
        onValueChange={(ageCategory) => onChange({ ageCategory })}
        required
      />
      <SelectField
        label="Event Format"
        options={EVENT_FORMATS}
        value={event.format}
        {...invalidProps("format")}
        onValueChange={(format) => onChange({ format })}
        required
      />
      <SelectField
        label="Rating Level"
        options={RATING_LEVELS}
        value={event.ratingLevel}
        {...invalidProps("ratingLevel")}
        onValueChange={(ratingLevel) => onChange({ ratingLevel })}
        required
      />
      <SelectField
        label="Qualifier"
        options={QUALIFIER_OPTIONS}
        value={event.qualifier}
        {...invalidProps("qualifier")}
        onValueChange={(qualifier) => onChange({ qualifier })}
        required
      />

      {invalid.size > 0 ? (
        <p id={errorId} role="alert" className="text-xs text-red-dark">
          Fill in the highlighted fields to add this event.
        </p>
      ) : null}
    </div>
  );
}

export { EventDraftFields };
