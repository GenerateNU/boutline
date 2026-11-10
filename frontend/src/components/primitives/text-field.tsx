import { cn } from "cn";
import { useId } from "react";

import { Input } from "@/components/primitives/input";

interface TextFieldProps extends React.ComponentProps<"input"> {
  label: React.ReactNode;
  supportingText?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

function TextField({
  className,
  id,
  label,
  supportingText,
  leading,
  trailing,
  "aria-describedby": ariaDescribedBy,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const supportingId = `${inputId}-supporting`;
  const describedBy =
    [ariaDescribedBy, supportingText ? supportingId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div
      data-slot="text-field"
      className={cn("group flex flex-col gap-1", className)}
    >
      <label
        htmlFor={inputId}
        className="text-xs font-medium text-neutral-secondary group-has-disabled:text-neutral-muted"
      >
        {label}
      </label>
      <div
        role="group"
        className={cn(
          "flex h-10 items-center gap-2 rounded-md border border-outline bg-background px-3 text-sm text-obsidian [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-neutral-secondary",
          "not-has-disabled:hover:border-neutral-muted focus-within:border-blue focus-within:ring-3 focus-within:ring-blue-lighter",
          "has-disabled:border-disabled-border has-disabled:bg-disabled has-disabled:text-disabled-foreground has-aria-invalid:border-red-dark",
        )}
      >
        {leading}
        <Input
          id={inputId}
          aria-describedby={describedBy}
          className="h-auto flex-1 rounded-none border-0 bg-transparent px-0 text-sm text-inherit placeholder:text-neutral-muted focus-visible:ring-0 disabled:opacity-100"
          {...props}
        />
        {trailing}
      </div>
      {supportingText ? (
        <p
          id={supportingId}
          className="text-xs text-neutral-secondary group-has-aria-invalid:text-red-dark"
        >
          {supportingText}
        </p>
      ) : null}
    </div>
  );
}

export { TextField };
