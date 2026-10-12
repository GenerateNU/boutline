import { Checkbox } from "@/components/primitives/checkbox";
import { Input } from "@/components/primitives/input";
import { Select } from "@/components/primitives/select";

const eventTypes = ["Individual", "Team"];
const weapons = ["Foil", "Épée", "Sabre"];
const genders = ["Men", "Women"];
const ageCategories = ["Y8", "Y10", "Y12", "Y14", "Cadet", "Junior", "Senior", "Veteran", "Open"];
const ratingLevels = ["Open", "B and under", "C and under", "D and under", "E and under", "Unrated"];
const seedingMethods = ["By rating", "By ranking points", "Random"];
const formats = ["Direct Elimination", "Pool to Elimination"];

type EventFieldsProps = {
  index: number;
};

function EventFields({ index }: EventFieldsProps) {
  const name = (field: string) => `events[${index}].${field}`;

  return (
    <fieldset className="flex flex-col gap-4 rounded-md border border-foreground p-4">
      <legend className="px-1 text-sm font-medium">Event {index + 1}</legend>

      <label className="flex flex-col gap-2 text-sm">
        Name
        <Input name={name("name")} placeholder="Y14 Men's Foil" />
      </label>

      <label className="flex flex-col gap-2 text-sm">
        Type
        <Select name={name("type")}>
          {eventTypes.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </Select>
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-2 text-sm">
          Date
          <Input name={name("date")} type="date" />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Time
          <Input name={name("time")} type="time" />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Fees
          <Input name={name("fees")} type="number" min="0" step="0.01" placeholder="0.00" />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Weapon
          <Select name={name("weapon")}>
            {weapons.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </Select>
        </label>
      </div>

      {/* Checking both genders makes the event mixed. */}
      <div className="flex flex-col gap-2 text-sm">
        Gender
        <div className="flex gap-6">
          {genders.map((gender) => (
            <label key={gender} className="flex items-center gap-2">
              <Checkbox name={name("gender")} value={gender} />
              {gender}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-2 text-sm">
          Age category
          <Select name={name("ageCategory")}>
            {ageCategories.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Rating level
          <Select name={name("ratingLevel")}>
            {ratingLevels.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </Select>
        </label>
      </div>
      <label className="flex flex-col gap-2 text-sm">
        Seeding
        <Select name={name("seeding")}>
          {seedingMethods.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </Select>
      </label>
      <label className="flex flex-col gap-2 text-sm">
        Format
        <Select name={name("format")}>
          {formats.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </Select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox name={name("qualifier")} />
        Qualifier
      </label>
    </fieldset>
  );
}

export { EventFields };
