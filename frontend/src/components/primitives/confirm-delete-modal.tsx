"use client";

import Image from "next/image";
import { Dialog } from "radix-ui";

import { Button } from "@/components/primitives/button";
import { ModalClose, ModalFooter } from "@/components/primitives/modal";
import { Text } from "@/components/primitives/text";

interface ConfirmDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  pending: boolean;
  onConfirm: () => void;
  onCloseAutoFocus?: (event: Event) => void;
}

// A centered warning rather than Modal's left-aligned header, so it composes Dialog directly.
function ConfirmDeleteModal({
  open,
  onOpenChange,
  title,
  pending,
  onConfirm,
  onCloseAutoFocus,
}: ConfirmDeleteModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-obsidian/40 motion-safe:data-[state=open]:animate-fade-in motion-safe:data-[state=closed]:animate-fade-out" />
        <Dialog.Content
          onCloseAutoFocus={onCloseAutoFocus}
          className="fixed inset-x-2 top-1/2 z-50 mx-auto flex max-w-87.5 -translate-y-1/2 flex-col gap-4 rounded-[20px] border border-outline bg-background p-5 font-manrope shadow-lg motion-safe:data-[state=open]:animate-pop-in motion-safe:data-[state=closed]:animate-pop-out"
        >
          <div className="flex justify-end">
            <ModalClose />
          </div>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-18 items-center justify-center rounded-[20px] bg-red-light">
              <Image src="/icons/delete-alert.svg" alt="" width={36} height={36} />
            </div>
            <Dialog.Title asChild>
              <Text as="h2" variant="title">
                {title}
              </Text>
            </Dialog.Title>
            <Dialog.Description asChild>
              <Text variant="muted">You cannot undo this change later.</Text>
            </Dialog.Description>
          </div>
          <ModalFooter className="pt-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={pending} onClick={onConfirm}>
              Confirm
            </Button>
          </ModalFooter>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { ConfirmDeleteModal };
