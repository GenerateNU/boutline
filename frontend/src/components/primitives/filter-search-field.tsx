import SearchOutlined from "@mui/icons-material/SearchOutlined";

import {
  Dropdown,
  DropdownMessage,
  DropdownOption,
  DropdownSection,
} from "@/components/primitives/dropdown";
import { Input } from "@/components/primitives/input";
import { Loading } from "@/components/primitives/loading";

interface Suggestion {
  value: string;
  label: string;
}

interface SuggestionListProps {
  suggestions: Suggestion[] | null;
  failed: boolean;
  loading?: boolean;
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
  loading,
  selected,
  onPick,
  noun,
  ...inputProps
}: FilterSearchFieldProps) {
  return (
    <div data-slot="filter-search-field" className="flex flex-col gap-2">
      <p className="text-sm text-obsidian">{label}</p>
      <div className="flex items-center gap-3 rounded-[12px] border border-outline bg-background px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-ring">
        <Input
          type="search"
          aria-label={label}
          placeholder={`Search ${label.toLowerCase()}`}
          {...inputProps}
          className="h-5 flex-1 rounded-none border-0 px-0 text-obsidian shadow-none placeholder:text-neutral-secondary focus-visible:ring-0"
        />
        <SearchOutlined aria-hidden className="size-4.5 shrink-0 text-neutral-secondary" />
      </div>
      <SuggestionList
        suggestions={suggestions}
        failed={failed}
        loading={loading}
        selected={selected}
        onPick={onPick}
        noun={noun}
      />
    </div>
  );
}

function SuggestionList({ suggestions, failed, loading, selected, onPick, noun }: SuggestionListProps) {
  if (failed) {
    return (
      <Dropdown>
        <DropdownMessage>{`Couldn’t load ${noun}.`}</DropdownMessage>
      </Dropdown>
    );
  }
  if (loading) {
    return <Loading className="py-2" />;
  }
  // null while nothing has been searched, so nothing shows until the user types.
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
