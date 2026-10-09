"use client";

import { cn } from "cn";
import { Check } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "group/checkbox flex size-5 shrink-0 items-center justify-center rounded-[4px] border-2 border-foreground text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        <Check
          aria-hidden
          strokeWidth={3}
          className="size-3.5 group-data-[state=indeterminate]/checkbox:hidden"
        />
        <span className="hidden size-2.5 rounded-[1px] bg-foreground group-data-[state=indeterminate]/checkbox:block" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
