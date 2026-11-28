"use client";

import { Button } from "@/components/primitives/button";
import { FilterButton } from "@/components/primitives/filter-button";
import { Sheet } from "@/components/primitives/sheet";

interface FilterSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerLabel: string;
  triggerIcon?: React.ReactNode;
  triggerActive?: boolean;
  description: string;
  submitLabel: string;
  onReset: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
}

function FilterSheetDialog({
  open,
  onOpenChange,
  triggerLabel,
  triggerIcon,
  triggerActive,
  description,
  submitLabel,
  onReset,
  onSubmit,
  children,
}: FilterSheetDialogProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Filter"
      description={description}
      trigger={
        <FilterButton aria-label={triggerLabel} active={triggerActive}>
          {triggerIcon}
        </FilterButton>
      }
    >
      <form
        className="flex flex-col gap-4"
        onReset={onReset}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        {children}

        <div className="flex flex-col gap-3">
          <Button type="reset" variant="tonal" className="w-full">
            Clear All
          </Button>
          <Button type="submit" className="w-full">
            {submitLabel}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

export { FilterSheetDialog };
