import { cn } from "cn";
import { useId } from "react";

import { Select, SelectItem } from "@/components/primitives/select";

interface SelectFieldProps extends Omit<React.ComponentProps<typeof Select>, "children"> {
  label: React.ReactNode;
  options: string[];
}

function SelectField({ className, id, label, options, ...props }: SelectFieldProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div data-slot="select-field" className={cn("group flex flex-col gap-1", className)}>
      <label htmlFor={selectId} className="text-xs font-medium text-neutral-secondary group-has-disabled:text-neutral-muted">
        {label}
        {props.required ? <span aria-hidden className="text-red-dark"> *</span> : null}
      </label>
      <Select
        id={selectId}
        className="group-has-[select:user-invalid]:border-2 group-has-[select:user-invalid]:border-red-dark group-has-[select:user-invalid]:px-2.75"
        {...props}
      >
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </Select>
    </div>
  );
}

export { SelectField };
