import { SearchField } from "./search-field";

interface PoolSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function PoolSearch({ value, onChange }: PoolSearchProps) {
  return (
    <div role="search">
      <SearchField
        aria-label="Search pools"
        placeholder="Search pools"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
