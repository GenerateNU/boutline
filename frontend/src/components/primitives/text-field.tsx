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
      className={cn("flex flex-col", variant === "filled" ? "gap-1" : "gap-1.5", className)}
    >
      <label
        htmlFor={inputId}
        className={variant === "filled" ? "text-base" : "text-sm font-medium text-obsidian"}
      >
        {label}
      </label>
      <div
        role="group"
        className={cn(
          "flex items-center gap-3 px-4 focus-within:ring-2 focus-within:ring-ring has-disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0",
          variant === "filled"
            ? "h-10 rounded-full bg-chip"
            : "rounded-[12px] border border-outline bg-background py-3 shadow-sm",
        )}
      >
        {leading}
        <Input
          id={inputId}
          aria-describedby={describedBy}
          className={cn(
            "h-auto flex-1 rounded-none border-0 bg-transparent px-0 focus-visible:ring-0 disabled:opacity-100",
            variant === "filled"
              ? "text-base"
              : "text-xs text-obsidian placeholder:text-neutral-secondary",
          )}
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
