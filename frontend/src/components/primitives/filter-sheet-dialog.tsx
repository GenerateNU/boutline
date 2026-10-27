"use client";

import { X } from "lucide-react";
import { Dialog } from "radix-ui";

import { Button } from "@/components/primitives/button";

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
        <Dialog.Overlay className="fixed inset-0 bg-foreground/40" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 mx-auto flex w-full max-w-mobile flex-col gap-5 rounded-t-3xl bg-background px-4 pt-4 pb-8 font-satoshi">
          <Dialog.Title className="text-xl font-semibold">Filter</Dialog.Title>
          <Dialog.Description className="sr-only">{description}</Dialog.Description>
          <Dialog.Close asChild>
            <Button
              type="button"
              variant="text"
              size="icon"
              aria-label="Close"
              className="absolute top-2 right-2"
            >
              <X aria-hidden className="size-5!" />
            </Button>
          </Dialog.Close>

          <form
            className="flex flex-col gap-5"
            onReset={onReset}
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
          >
            {children}

            <div className="flex items-center justify-between gap-4">
              <Button
                type="reset"
                variant="text"
                className="h-auto px-0 font-bold underline hover:bg-transparent"
              >
                Clear all
              </Button>
              <Button
                type="submit"
                className="w-69 rounded-sm bg-brand font-normal text-background hover:bg-brand/90"
              >
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
