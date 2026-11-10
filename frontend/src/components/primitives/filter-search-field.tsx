import { SearchBar } from "@/components/primitives/search-bar";

interface FilterSearchFieldProps extends Omit<React.ComponentProps<"input">, "type"> {
  label: string;
  children?: React.ReactNode;
}

// children render under the input, e.g. the matches for what was typed.
function FilterSearchField({ label, children, ...inputProps }: FilterSearchFieldProps) {
  return (
    <div data-slot="filter-search-field" className="flex flex-col gap-2">
      <p className="text-sm font-medium text-obsidian">{label}</p>
      <SearchBar
        type="search"
        aria-label={label}
        placeholder={`Search ${label.toLowerCase()}`}
        expanded={false}
        {...inputProps}
      />
      {children}
    </div>
  );
}

export { FilterSearchField };
