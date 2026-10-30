"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/primitives/button";
import { Select } from "@/components/primitives/select";
import { TextField } from "@/components/primitives/text-field";
import { clearTournamentDraft } from "@/features/tournament/lib/tournament-draft";

const eventTypes = ["Individual", "Team"];
const weapons = ["Foil", "Épée", "Sabre"];
const genderMixes = ["Men", "Women", "Mixed"];
const ageCategories = ["Y8", "Y10", "Y12", "Y14", "Cadet", "Junior", "Senior", "Veteran", "Open"];
const ratingLevels = ["Open", "B and under", "C and under", "D and under", "E and under", "Unrated"];
const formats = ["Direct Elimination", "Pool to Elimination"];
const qualifierOptions = ["No", "Yes"];

function SelectField({ label, name, options }: { label: string; name: string; options: string[] }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <Select variant="filled" name={name} placeholder="" required>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </Select>
    </label>
  );
}

function NewEventForm({ doneHref }: { doneHref: string }) {
  const router = useRouter();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearTournamentDraft();
    router.push(doneHref);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <SelectField label="Type of event" name="type" options={eventTypes} />
      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        <TextField variant="filled" label="Date" name="date" type="date" required />
        <TextField variant="filled" label="Time" name="time" type="time" required />
        <SelectField label="Weapon" name="weapon" options={weapons} />
        <SelectField label="Gender Mix" name="genderMix" options={genderMixes} />
        <SelectField label="Age Category" name="ageCategory" options={ageCategories} />
        <SelectField label="Rating Level" name="ratingLevel" options={ratingLevels} />
      </div>
      <SelectField label="Event Format" name="format" options={formats} />
      <SelectField label="Qualifier" name="qualifier" options={qualifierOptions} />

      <Button type="submit" variant="tonal" className="mt-4 h-12 rounded-full">
        Continue
      </Button>
    </form>
  );
}

export { NewEventForm };
