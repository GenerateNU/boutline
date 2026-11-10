"use client";

import { cn } from "cn";
import { X } from "lucide-react";
import { Dialog } from "radix-ui";

import { Button } from "@/components/primitives/button";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onCloseAutoFocus?: (event: Event) => void;
  children: React.ReactNode;
}

function Modal({
  open,
  onOpenChange,
  title,
  description,
  onCloseAutoFocus,
  children,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-obsidian/40" />
        <Dialog.Content
          data-slot="modal"
          onCloseAutoFocus={onCloseAutoFocus}
          className="fixed inset-x-4 top-1/2 z-50 mx-auto flex max-w-88 -translate-y-1/2 flex-col gap-4 rounded-xl bg-background p-4 font-satoshi shadow-md"
        >
          <div className="flex items-start gap-3">
            <div className="flex flex-1 flex-col gap-1">
              <Dialog.Title className="text-base font-semibold text-obsidian">
                {title}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-neutral-secondary">
                {description}
              </Dialog.Description>
            </div>
            <ModalClose />
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// The X in the top-right corner, shared by every dialog's header.
function ModalClose() {
  return (
    <Dialog.Close asChild>
      <Button
        type="button"
        variant="text"
        size="icon"
        aria-label="Close"
        className="size-8 text-neutral-secondary"
      >
        <X aria-hidden />
      </Button>
    </Dialog.Close>
  );
}

function ModalFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="modal-footer"
      className={cn("grid grid-cols-2 gap-3 *:w-full", className)}
      {...props}
    />
  );
}

export { Modal, ModalClose, ModalFooter };
