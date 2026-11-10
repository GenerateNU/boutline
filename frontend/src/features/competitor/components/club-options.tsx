import {
  Dropdown,
  DropdownMessage,
  DropdownOption,
  DropdownSection,
} from "@/components/primitives/dropdown";
import type { Team } from "@/types/competitor";

interface ClubOptionsProps {
  clubs: Team[] | null;
  failed: boolean;
  selectedClub: string;
  onPickClub: (name: string) => void;
}

function ClubOptions({ clubs, failed, selectedClub, onPickClub }: ClubOptionsProps) {
  if (failed) {
    return (
      <Dropdown>
        <DropdownMessage>Couldn’t load clubs.</DropdownMessage>
      </Dropdown>
    );
  }
  // null until the first search answers, so nothing flashes "No clubs match."
  if (clubs === null) {
    return null;
  }
  if (clubs.length === 0) {
    return (
      <Dropdown>
        <DropdownMessage>No clubs match.</DropdownMessage>
      </Dropdown>
    );
  }
  return (
    <Dropdown>
      <DropdownSection>
        {clubs.map(({ name }) => (
          <DropdownOption key={name} selected={name === selectedClub} onClick={() => onPickClub(name)}>
            {name}
          </DropdownOption>
        ))}
      </DropdownSection>
    </Dropdown>
  );
}

export { ClubOptions };
