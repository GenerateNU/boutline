import { cn } from "cn";
import { useId } from "react";

import { Select } from "@/components/primitives/select";

interface SelectFieldProps extends Omit<React.ComponentProps<typeof Select>, "children"> {
  label: React.ReactNode;
  options: string[];
}

function SelectField({ className, id, label, options, ...props }: SelectFieldProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div data-slot="select-field" className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={selectId} className="text-base">
        {label}
      </label>
      <Select id={selectId} {...props}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </Select>
    </div>
  );
}

export { SelectField };
