"use client";

import { Dialog } from "radix-ui";

import { Button } from "@/components/primitives/button";
import { ModalClose } from "@/components/primitives/modal";

interface FilterSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerLabel: string;
  triggerIcon: React.ReactNode;
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
        <Button
          type="button"
          variant="outline"
          aria-label={triggerLabel}
          className="h-12 gap-1 rounded-lg bg-background px-2.5"
        >
          {triggerIcon}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-obsidian/40" />
        <Dialog.Content
          data-slot="filter-sheet"
          className="fixed inset-x-0 bottom-0 mx-auto flex max-h-dvh w-full max-w-mobile flex-col gap-5 overflow-y-auto rounded-t-xl bg-background p-4 pb-8 font-satoshi shadow-md"
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-obsidian">Filter</Dialog.Title>
            <ModalClose />
          </div>
          <Dialog.Description className="sr-only">{description}</Dialog.Description>

          <form
            className="flex flex-col gap-5"
            onReset={onReset}
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
          >
            {children}

            <div className="flex flex-col gap-2">
              <Button
                type="reset"
                variant="tonal"
                size="lg"
                className="w-full bg-blue-lightest shadow-none"
              >
                Clear All
              </Button>
              <Button type="submit" size="lg" className="w-full">
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
