import { Search } from "lucide-react";

import { Input } from "@/components/primitives/input";

interface FilterSearchFieldProps extends Omit<React.ComponentProps<"input">, "type"> {
  label: string;
  children?: React.ReactNode;
}

// children render under the input, e.g. the matches for what was typed.
function FilterSearchField({ label, children, ...inputProps }: FilterSearchFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-bold">{label}</p>
      <div className="flex items-center gap-3 border border-brand py-3 pr-3 pl-4 focus-within:ring-2 focus-within:ring-ring">
        <Input
          type="search"
          aria-label={label}
          placeholder={`Search ${label.toLowerCase()}`}
          {...inputProps}
          className="h-auto flex-1 rounded-none border-0 px-0 text-brand placeholder:text-brand focus-visible:ring-0"
        />
        <Search aria-hidden className="size-6 shrink-0" />
      </div>
      {children}
    </div>
  );
}

export { FilterSearchField };
