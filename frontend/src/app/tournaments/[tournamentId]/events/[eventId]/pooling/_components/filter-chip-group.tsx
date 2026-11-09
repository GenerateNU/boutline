import { ToggleGroup } from "radix-ui";
import { useId } from "react";

const columnClasses: Record<3 | 4, string> = {
  3: "grid grid-cols-3 gap-2",
  4: "grid grid-cols-4 gap-2",
};

interface FilterChipGroupProps<T extends string> {
  label: string;
  columns: 3 | 4;
  options: { value: T; label: string }[];
  value: T;
  onValueChange: (value: T) => void;
}

export function FilterChipGroup<T extends string>({ label, columns, options, value, onValueChange }: FilterChipGroupProps<T>) {
  const labelId = useId();

  return (
    <div className="flex flex-col gap-2">
      <span id={labelId} className="text-sm">
        {label}
      </span>
      <ToggleGroup.Root
        type="single"
        value={value}
        // Radix reports "" when the active chip is clicked again; keep the current choice.
        onValueChange={(next) => next && onValueChange(next as T)}
        aria-labelledby={labelId}
        className={columnClasses[columns]}
      >
        {options.map((option) => (
          <ToggleGroup.Item
            key={option.value}
            value={option.value}
            className="h-8 cursor-pointer truncate rounded-md border border-blue bg-card px-1 text-xs text-blue outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=on]:bg-blue data-[state=on]:text-white"
          >
            {option.label}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
    </div>
  );
}
