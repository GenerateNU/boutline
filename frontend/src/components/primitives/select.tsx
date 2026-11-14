"use client";

import { cn } from "cn";
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";
import { Select as SelectPrimitive } from "radix-ui";

// Shared with DateField, whose trigger looks the same.
const SELECT_TRIGGER_CLASS_NAME = cn(
  "group flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-outline bg-background px-3 text-sm text-obsidian outline-none transition-colors",
  "hover:bg-blue-lightest focus-visible:border-blue focus-visible:ring-3 focus-visible:ring-blue-lighter data-[state=open]:border-blue data-[state=open]:ring-3 data-[state=open]:ring-blue-lighter",
  "aria-invalid:border-2 aria-invalid:border-red-dark aria-invalid:px-2.75 data-placeholder:text-neutral-muted",
  "disabled:pointer-events-none disabled:border-disabled-border disabled:bg-disabled disabled:text-disabled-foreground",
);

interface SelectProps extends React.ComponentProps<typeof SelectPrimitive.Root> {
  id?: string;
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

function Select({
  id,
  className,
  placeholder = "Select an option",
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  children,
  ...props
}: SelectProps) {
  return (
    <SelectPrimitive.Root {...props}>
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        data-slot="select"
        className={cn(SELECT_TRIGGER_CLASS_NAME, className)}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ExpandMoreOutlined className="size-4 shrink-0 text-neutral-secondary transition-transform group-data-[state=open]:rotate-180" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="z-50 w-(--radix-select-trigger-width) rounded-lg border border-outline bg-background shadow-md"
        >
          <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "cursor-pointer rounded-md px-3 py-2 text-sm text-neutral-secondary outline-none data-highlighted:bg-blue-lightest",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export { Select, SelectItem, SELECT_TRIGGER_CLASS_NAME as selectTriggerClassName };
