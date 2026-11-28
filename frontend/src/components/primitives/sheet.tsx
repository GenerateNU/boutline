"use client";

import { Dialog } from "radix-ui";

import { ModalClose } from "@/components/primitives/modal";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  trigger?: React.ReactNode;
  onCloseAutoFocus?: (event: Event) => void;
  children: React.ReactNode;
}

function Sheet({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  onCloseAutoFocus,
  children,
}: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-obsidian/40 motion-safe:data-[state=open]:animate-fade-in motion-safe:data-[state=closed]:animate-fade-out" />
        {/* The scroll lock hides the scrollbar and pads the page by its width; ending the sheet at
            that padding keeps it centered under the page column instead of the full window. */}
        <Dialog.Content
          onCloseAutoFocus={onCloseAutoFocus}
          className="fixed right-[var(--removed-body-scroll-bar-size,0px)] bottom-0 left-0 z-50 mx-auto flex max-h-dvh w-full max-w-mobile flex-col gap-4 overflow-y-auto rounded-t-3xl bg-background px-4 pt-4 pb-8 font-manrope motion-safe:data-[state=open]:animate-sheet-in motion-safe:data-[state=closed]:animate-sheet-out"
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-xl font-semibold text-obsidian">{title}</Dialog.Title>
            <ModalClose />
          </div>
          <Dialog.Description className="sr-only">{description}</Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { Sheet };
