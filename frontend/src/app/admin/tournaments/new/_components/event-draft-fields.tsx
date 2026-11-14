"use client";

import { useState } from "react";

import { Button } from "@/components/primitives/button";
import { SelectField } from "@/components/primitives/select-field";
import { TextField } from "@/components/primitives/text-field";

import { EventDraft } from "../_types/tournament-draft";
import {
  EVENT_FORMATS,
  EVENT_TYPES,
  missingEventFields,
  missingFencerFields,
  RequiredEventField,
} from "../tournament-draft-helpers";

const WEAPONS = ["Foil", "Épée", "Sabre"];
const GENDER_MIXES = ["Men", "Women", "Mixed"];
const AGE_CATEGORIES = ["Y8", "Y10", "Y12", "Y14", "Cadet", "Junior", "Senior", "Veteran", "Open"];
const RATING_LEVELS = ["Open", "B and under", "C and under", "D and under", "E and under", "Unrated"];
const QUALIFIER_OPTIONS = ["No", "Yes"];

interface EventDraftFieldsProps {
  event: EventDraft;
  // An event can only be saved once its tournament is.
  canSave: boolean;
  onChange: (patch: Partial<EventDraft>) => void;
  // The fencer list, shown above Save since saving covers the fencers too.
  children: React.ReactNode;
}

function EventDraftFields({ event, canSave, onChange, children }: EventDraftFieldsProps) {
  const [attempted, setAttempted] = useState(false);
  // Recomputed from the event, so a field turns back to normal once it's filled.
  const invalid = new Set<RequiredEventField>(attempted ? missingEventFields(event) : []);
  const hasIncompleteFencers = event.fencers.some((fencer) => missingFencerFields(fencer).length > 0);
  const showFencerError = attempted && hasIncompleteFencers;

  // Saving checks only this card and its fencers. The browser's own required
  // check runs for the whole form on submit, so a failed save marks the empty
  // fields itself; incomplete fencers already say what they're missing.
  function handleSave() {
    if (missingEventFields(event).length > 0 || hasIncompleteFencers) {
      setAttempted(true);
      return;
    }
    onChange({ saved: true });
  }

  return (
    <>
      <TextField
        label="Event name"
        placeholder="Y14 Women's Foil"
        value={event.name}
        aria-invalid={invalid.has("name")}
        onChange={(change) => onChange({ name: change.target.value })}
        required
      />
      <SelectField
        label="Type of event"
        options={EVENT_TYPES}
        value={event.type}
        aria-invalid={invalid.has("type")}
        onValueChange={(type) => onChange({ type })}
        required
      />
      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        <TextField
          label="Date"
          type="date"
          value={event.date}
          aria-invalid={invalid.has("date")}
          onChange={(change) => onChange({ date: change.target.value })}
          required
        />
        <TextField
          label="Time"
          type="time"
          value={event.time}
          aria-invalid={invalid.has("time")}
          onChange={(change) => onChange({ time: change.target.value })}
          required
        />
        <SelectField
          label="Weapon"
          options={WEAPONS}
          value={event.weapon}
          aria-invalid={invalid.has("weapon")}
          onValueChange={(weapon) => onChange({ weapon })}
          required
        />
        <SelectField
          label="Gender Mix"
          options={GENDER_MIXES}
          value={event.genderMix}
          aria-invalid={invalid.has("genderMix")}
          onValueChange={(genderMix) => onChange({ genderMix })}
          required
        />
        <SelectField
          label="Age Category"
          options={AGE_CATEGORIES}
          value={event.ageCategory}
          aria-invalid={invalid.has("ageCategory")}
          onValueChange={(ageCategory) => onChange({ ageCategory })}
          required
        />
        <SelectField
          label="Rating Level"
          options={RATING_LEVELS}
          value={event.ratingLevel}
          aria-invalid={invalid.has("ratingLevel")}
          onValueChange={(ratingLevel) => onChange({ ratingLevel })}
          required
        />
      </div>
      <SelectField
        label="Event Format"
        options={EVENT_FORMATS}
        value={event.format}
        aria-invalid={invalid.has("format")}
        onValueChange={(format) => onChange({ format })}
        required
      />
      <SelectField
        label="Qualifier"
        options={QUALIFIER_OPTIONS}
        value={event.qualifier}
        aria-invalid={invalid.has("qualifier")}
        onValueChange={(qualifier) => onChange({ qualifier })}
        required
      />

      {children}
      {invalid.size > 0 ? (
        <p role="alert" className="text-xs text-red-dark">
          Fill in the highlighted fields to save this event.
        </p>
      ) : null}
      {showFencerError ? (
        <p role="alert" className="text-xs text-red-dark">
          Finish the fencers marked as missing details to save this event.
        </p>
      ) : null}
      {canSave ? null : (
        <p className="text-xs text-neutral-secondary">Save the tournament details before saving an event.</p>
      )}
      <Button type="button" variant="tonal" className="h-10 rounded-full" disabled={!canSave} onClick={handleSave}>
        Save event
      </Button>
    </>
  );
}

export { EventDraftFields };
