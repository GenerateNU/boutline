import type { SelectOption } from "@/components/primitives/select-field";
import { AGE_LABELS } from "@/features/event/lib/event-filters";

// Options for the disabled filters competitors have no data behind yet.
const WEAPON_OPTIONS: SelectOption[] = [
  { value: "foil", label: "Foil" },
  { value: "sabre", label: "Sabre" },
  { value: "epee", label: "Epee" },
];

const AGE_OPTIONS: SelectOption[] = Object.entries(AGE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const GENDER_OPTIONS: SelectOption[] = [
  { value: "female", label: "Women" },
  { value: "male", label: "Men" },
  { value: "other", label: "Other" },
];

export { AGE_OPTIONS, GENDER_OPTIONS, WEAPON_OPTIONS };
