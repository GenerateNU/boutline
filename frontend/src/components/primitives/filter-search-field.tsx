import { Search } from "lucide-react";

import { Input } from "@/components/primitives/input";

interface FilterSearchFieldProps extends Omit<React.ComponentProps<"input">, "type"> {
  label: string;
  children?: React.ReactNode;
}

// children render under the input, e.g. the matches for what was typed.
function FilterSearchField({ label, children, ...inputProps }: FilterSearchFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-obsidian">{label}</p>
      <div className="flex items-center gap-3 rounded-[12px] border border-outline bg-background px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-ring">
        <Input
          type="search"
          aria-label={label}
          placeholder={`Search ${label.toLowerCase()}`}
          {...inputProps}
          className="h-5 flex-1 rounded-none border-0 px-0 text-obsidian shadow-none placeholder:text-neutral-secondary focus-visible:ring-0"
        />
        <Search aria-hidden className="size-4.5 shrink-0 text-neutral-secondary" />
      </div>
      {children}
    </div>
  );
}

export { FilterSearchField };
