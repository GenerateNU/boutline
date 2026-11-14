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
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <FilterButton aria-label={triggerLabel} active={triggerActive}>
          {triggerIcon}
        </FilterButton>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-obsidian/40 motion-safe:data-[state=open]:animate-fade-in motion-safe:data-[state=closed]:animate-fade-out" />
        {/* The scroll lock hides the scrollbar and pads the page by its width; ending the sheet at
            that padding keeps it centered under the page column instead of the full window. */}
        <Dialog.Content className="fixed right-[var(--removed-body-scroll-bar-size,0px)] bottom-0 left-0 z-50 mx-auto flex max-h-dvh w-full max-w-mobile flex-col gap-4 overflow-y-auto rounded-t-3xl bg-background px-4 pt-4 pb-8 font-manrope motion-safe:data-[state=open]:animate-sheet-in motion-safe:data-[state=closed]:animate-sheet-out">
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
