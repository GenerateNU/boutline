"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/primitives/button";
import { SelectField } from "@/components/primitives/select-field";
import { TextField } from "@/components/primitives/text-field";
import { clearTournamentDraft } from "@/features/tournament/lib/tournament-draft";

const EVENT_TYPES = ["Individual"];
const WEAPONS = ["Foil", "Épée", "Sabre"];
const GENDER_MIXES = ["Men", "Women", "Mixed"];
const AGE_CATEGORIES = ["Y8", "Y10", "Y12", "Y14", "Cadet", "Junior", "Senior", "Veteran", "Open"];
const RATING_LEVELS = ["Open", "B and under", "C and under", "D and under", "E and under", "Unrated"];
const FORMATS = ["Pool to Direct Elimination"];
const QUALIFIER_OPTIONS = ["No", "Yes"];

interface NewEventFormProps {
  doneHref: string;
  completesTournamentDraft: boolean;
}

function NewEventForm({ doneHref, completesTournamentDraft }: NewEventFormProps) {
  const router = useRouter();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (completesTournamentDraft) {
      clearTournamentDraft();
    }
    router.push(doneHref);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <SelectField label="Type of event" name="type" options={EVENT_TYPES} defaultValue={EVENT_TYPES[0]} required />
      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        <TextField label="Date" name="date" type="date" required />
        <TextField label="Time" name="time" type="time" required />
        <SelectField label="Weapon" name="weapon" options={WEAPONS} required />
        <SelectField label="Gender Mix" name="genderMix" options={GENDER_MIXES} required />
        <SelectField label="Age Category" name="ageCategory" options={AGE_CATEGORIES} required />
        <SelectField label="Rating Level" name="ratingLevel" options={RATING_LEVELS} required />
      </div>
      <SelectField label="Event Format" name="format" options={FORMATS} defaultValue={FORMATS[0]} required />
      <SelectField label="Qualifier" name="qualifier" options={QUALIFIER_OPTIONS} required />

      <Button type="submit" variant="tonal" className="mt-4 h-12 rounded-full">
        Continue
      </Button>
    </form>
  );
}

export { NewEventForm };
