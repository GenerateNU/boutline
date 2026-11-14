import { SelectField } from "@/components/primitives/select-field";
import { TextField } from "@/components/primitives/text-field";
import { CompetitorRating } from "@/types/competitor-import";

import { FencerDraft } from "../_types/tournament-draft";

// The values POST /competitors accepts.
const GENDERS = ["F", "M", "O"];
const RATINGS: CompetitorRating[] = ["A", "B", "C", "D", "E", "U"];

interface FencerDraftFieldsProps {
  fencer: FencerDraft;
  onChange: (patch: Partial<FencerDraft>) => void;
}

function FencerDraftFields({ fencer, onChange }: FencerDraftFieldsProps) {
  function handleRatingYear(value: string) {
    const year = Number(value);
    onChange({ ratingYear: value === "" || Number.isNaN(year) ? undefined : year });
  }

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-4">
      <TextField
        label="First name"
        value={fencer.firstName}
        onChange={(change) => onChange({ firstName: change.target.value })}
        required
      />
      <TextField
        label="Last name"
        value={fencer.lastName}
        onChange={(change) => onChange({ lastName: change.target.value })}
        required
      />
      <SelectField
        label="Gender"
        options={GENDERS}
        value={fencer.gender}
        onValueChange={(gender) => onChange({ gender })}
        required
      />
      <TextField
        label="Birth date"
        type="date"
        value={fencer.birthdate}
        onChange={(change) => onChange({ birthdate: change.target.value })}
        required
      />
      <TextField
        label="Division"
        value={fencer.division}
        onChange={(change) => onChange({ division: change.target.value })}
        required
      />
      <TextField
        label="Country"
        value={fencer.country}
        onChange={(change) => onChange({ country: change.target.value })}
      />
      <TextField
        label="Club"
        className="col-span-2"
        value={fencer.club}
        onChange={(change) => onChange({ club: change.target.value })}
      />
      <TextField
        label="Member #"
        className="col-span-2"
        inputMode="numeric"
        value={fencer.memberNumber}
        onChange={(change) => onChange({ memberNumber: change.target.value })}
      />
      <SelectField
        label="Rating"
        options={RATINGS}
        value={fencer.rating}
        onValueChange={(rating) => onChange({ rating: rating as CompetitorRating })}
      />
      <TextField
        label="Rating year"
        inputMode="numeric"
        placeholder="2024"
        value={fencer.ratingYear?.toString() ?? ""}
        onChange={(change) => handleRatingYear(change.target.value)}
      />
    </div>
  );
}

export { FencerDraftFields };
