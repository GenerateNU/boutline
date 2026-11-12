"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/primitives/button";
import { SelectField } from "@/components/primitives/select-field";
import { TextField } from "@/components/primitives/text-field";
import { clearTournamentDraft } from "@/features/tournament/lib/tournament-draft";

const eventTypes = ["Individual"];
const weapons = ["Foil", "Épée", "Sabre"];
const genderMixes = ["Men", "Women", "Mixed"];
const ageCategories = ["Y8", "Y10", "Y12", "Y14", "Cadet", "Junior", "Senior", "Veteran", "Open"];
const ratingLevels = ["Open", "B and under", "C and under", "D and under", "E and under", "Unrated"];
const formats = ["Pool to Direct Elimination"];
const qualifierOptions = ["No", "Yes"];

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
      <SelectField label="Type of event" name="type" options={eventTypes} defaultValue={eventTypes[0]} required />
      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        <TextField label="Date" name="date" type="date" required />
        <TextField label="Time" name="time" type="time" required />
        <SelectField label="Weapon" name="weapon" options={weapons} required />
        <SelectField label="Gender Mix" name="genderMix" options={genderMixes} required />
        <SelectField label="Age Category" name="ageCategory" options={ageCategories} required />
        <SelectField label="Rating Level" name="ratingLevel" options={ratingLevels} required />
      </div>
      <SelectField label="Event Format" name="format" options={formats} defaultValue={formats[0]} required />
      <SelectField label="Qualifier" name="qualifier" options={qualifierOptions} required />

      <Button type="submit" variant="tonal" className="mt-4 h-12 rounded-full">
        Continue
      </Button>
    </form>
  );
}

export { NewEventForm };
