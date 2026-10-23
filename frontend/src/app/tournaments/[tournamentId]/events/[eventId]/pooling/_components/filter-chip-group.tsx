import { ToggleGroup } from "radix-ui";
import { useId } from "react";

interface FilterChipGroupProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onValueChange: (value: T) => void;
}

export function FilterChipGroup<T extends string>({ label, options, value, onValueChange }: FilterChipGroupProps<T>) {
  const labelId = useId();

  return (
    <div className="flex flex-col gap-2">
      <span id={labelId} className="text-sm font-bold">
        {label}
      </span>
      <ToggleGroup.Root
        type="single"
        value={value}
        // Radix reports "" when the active chip is clicked again; keep the current choice.
        onValueChange={(next) => next && onValueChange(next as T)}
        aria-labelledby={labelId}
        className="flex flex-wrap gap-2"
      >
        {options.map((option) => (
          <ToggleGroup.Item
            key={option.value}
            value={option.value}
            className="cursor-pointer rounded-sm border border-brand bg-background px-4 py-1.5 text-sm text-brand outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=on]:bg-brand data-[state=on]:text-primary-foreground"
          >
            {option.label}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
    </div>
  );
}
