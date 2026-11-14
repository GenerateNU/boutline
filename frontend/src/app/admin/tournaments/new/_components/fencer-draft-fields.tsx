import { SelectField } from "@/components/primitives/select-field";
import { TextField } from "@/components/primitives/text-field";
import { CompetitorRating } from "@/types/competitor-import";

import { FencerDraft } from "../_types/tournament-draft";
import { RequiredFencerField } from "../tournament-draft-helpers";

// The values POST /competitors accepts.
const GENDERS = ["F", "M", "O"];
const RATINGS: CompetitorRating[] = ["A", "B", "C", "D", "E", "U"];

interface FencerDraftFieldsProps {
  fencer: FencerDraft;
  invalid: ReadonlySet<RequiredFencerField>;
  // The card's "Missing …" line, which invalid fields point at.
  errorId: string;
  onChange: (patch: Partial<FencerDraft>) => void;
}

function FencerDraftFields({ fencer, invalid, errorId, onChange }: FencerDraftFieldsProps) {
  function invalidProps(field: RequiredFencerField) {
    return invalid.has(field) ? { "aria-invalid": true, "aria-describedby": errorId } : {};
  }

  function handleRatingYear(value: string) {
    const year = Number(value);
    onChange({ ratingYear: value === "" || Number.isNaN(year) ? undefined : year });
  }

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-4">
      <TextField
        label="First name"
        placeholder="Maria"
        value={fencer.firstName}
        {...invalidProps("firstName")}
        onChange={(change) => onChange({ firstName: change.target.value })}
        required
      />
      <TextField
        label="Last name"
        placeholder="Alvarez"
        value={fencer.lastName}
        {...invalidProps("lastName")}
        onChange={(change) => onChange({ lastName: change.target.value })}
        required
      />
      <SelectField
        label="Gender"
        options={GENDERS}
        value={fencer.gender}
        {...invalidProps("gender")}
        onValueChange={(gender) => onChange({ gender })}
        required
      />
      <TextField
        label="Birth date"
        type="date"
        value={fencer.birthdate}
        {...invalidProps("birthdate")}
        onChange={(change) => onChange({ birthdate: change.target.value })}
        required
      />
      <TextField
        label="Division"
        placeholder="New England"
        value={fencer.division}
        {...invalidProps("division")}
        onChange={(change) => onChange({ division: change.target.value })}
        required
      />
      <TextField
        label="Country"
        placeholder="USA"
        value={fencer.country}
        onChange={(change) => onChange({ country: change.target.value })}
      />
      <TextField
        label="Club"
        className="col-span-2"
        placeholder="Boston Fencing Club"
        value={fencer.club}
        onChange={(change) => onChange({ club: change.target.value })}
      />
      <TextField
        label="Member #"
        className="col-span-2"
        inputMode="numeric"
        placeholder="100234501"
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
