import {
  Dropdown,
  DropdownMessage,
  DropdownOption,
  DropdownSection,
} from "@/components/primitives/dropdown";
import { SearchBar } from "@/components/primitives/search-bar";

interface Suggestion {
  value: string;
  label: string;
}

interface SuggestionListProps {
  suggestions: Suggestion[] | null;
  failed: boolean;
  selected: string;
  onPick: (value: string) => void;
  // Plural noun for the messages, e.g. "clubs" → "No clubs match."
  noun: string;
}

interface FilterSearchFieldProps
  extends Omit<React.ComponentProps<"input">, "type" | "children">,
    SuggestionListProps {
  label: string;
}

function FilterSearchField({
  label,
  suggestions,
  failed,
  selected,
  onPick,
  noun,
  ...inputProps
}: FilterSearchFieldProps) {
  return (
    <div data-slot="filter-search-field" className="flex flex-col gap-2">
      <p className="text-sm font-medium text-obsidian">{label}</p>
      <SearchBar
        type="search"
        aria-label={label}
        placeholder={`Search ${label.toLowerCase()}`}
        {...inputProps}
      >
        <SuggestionList
          suggestions={suggestions}
          failed={failed}
          selected={selected}
          onPick={onPick}
          noun={noun}
        />
      </SearchBar>
    </div>
  );
}

function SuggestionList({ suggestions, failed, selected, onPick, noun }: SuggestionListProps) {
  if (failed) {
    return (
      <Dropdown>
        <DropdownMessage>{`Couldn’t load ${noun}.`}</DropdownMessage>
      </Dropdown>
    );
  }
  // null while nothing has been searched, so the dropdown stays closed.
  if (suggestions === null) {
    return null;
  }
  if (suggestions.length === 0) {
    return (
      <Dropdown>
        <DropdownMessage>{`No ${noun} match.`}</DropdownMessage>
      </Dropdown>
    );
  }
  return (
    <Dropdown>
      <DropdownSection>
        {suggestions.map(({ value, label }) => (
          <DropdownOption key={value} selected={value === selected} onClick={() => onPick(value)}>
            {label}
          </DropdownOption>
        ))}
      </DropdownSection>
    </Dropdown>
  );
}

export { FilterSearchField, type Suggestion };
