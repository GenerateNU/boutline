"use client";

import { Dialog } from "radix-ui";

import { Button } from "@/components/primitives/button";
import { FilterButton } from "@/components/primitives/filter-button";
import { ModalClose } from "@/components/primitives/modal";

interface FilterSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerLabel: string;
  triggerIcon?: React.ReactNode;
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
  description,
  submitLabel,
  onReset,
  onSubmit,
  children,
}: FilterSheetDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <FilterButton aria-label={triggerLabel}>
          {triggerIcon}
        </FilterButton>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-obsidian/40" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 mx-auto flex max-h-dvh w-full max-w-mobile flex-col gap-4 overflow-y-auto rounded-t-3xl bg-background px-4 pt-4 pb-8 font-manrope">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-xl font-semibold text-obsidian">
              Filter
            </Dialog.Title>
            <ModalClose />
          </div>
          <Dialog.Description className="sr-only">{description}</Dialog.Description>

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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { FilterSheetDialog };
