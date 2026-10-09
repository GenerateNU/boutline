"use client";

import { cn } from "cn";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";

function Radio({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio"
      className={cn("flex gap-4", className)}
      {...props}
    />
  );
}

function RadioItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-item"
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <span className="size-2.5 rounded-full bg-foreground" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { Radio, RadioItem };
