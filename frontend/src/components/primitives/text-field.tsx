import { cn } from "cn";
import { useId } from "react";

import { Input } from "@/components/primitives/input";

interface TextFieldProps extends React.ComponentProps<"input"> {
  label: React.ReactNode;
  variant?: "outline" | "filled";
  supportingText?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

function TextField({
  className,
  id,
  label,
  variant = "outline",
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
      className={cn("flex flex-col gap-1", className)}
    >
      <label htmlFor={inputId} className="text-base">
        {label}
      </label>
      <div
        role="group"
        className={cn(
          "flex h-12 items-center gap-3 px-4 focus-within:ring-2 focus-within:ring-ring has-disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0",
          variant === "filled"
            ? "h-10 rounded-full bg-chip"
            : "border border-foreground bg-background",
        )}
      >
        {leading}
        <Input
          id={inputId}
          aria-describedby={describedBy}
          className="h-auto flex-1 rounded-none border-0 bg-transparent px-0 text-base focus-visible:ring-0 disabled:opacity-100"
          {...props}
        />
        {trailing}
      </div>
      {supportingText ? (
        <p id={supportingId} className="px-6 text-sm">
          {supportingText}
        </p>
      ) : null}
    </div>
  );
}

export { TextField };
