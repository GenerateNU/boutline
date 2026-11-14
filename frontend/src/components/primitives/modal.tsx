"use client";

import { cn } from "cn";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import { Dialog } from "radix-ui";

import { Button } from "@/components/primitives/button";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onCloseAutoFocus?: (event: Event) => void;
  className?: string;
  children: React.ReactNode;
}

function Modal({
  open,
  onOpenChange,
  title,
  description,
  onCloseAutoFocus,
  className,
  children,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-obsidian/40" />
        <Dialog.Content
          data-slot="modal"
          onCloseAutoFocus={onCloseAutoFocus}
          className={cn(
            "fixed inset-x-2 top-1/2 z-50 mx-auto flex max-w-86.25 -translate-y-1/2 flex-col gap-5 rounded-3xl bg-background p-5 pt-6 font-manrope shadow-lg",
            className,
          )}
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-xl font-semibold text-obsidian">{title}</Dialog.Title>
            <ModalClose />
          </div>
          <Dialog.Description className="-mt-1 text-sm text-neutral-secondary">
            {description}
          </Dialog.Description>
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
        className="-m-2 text-obsidian [&_svg]:size-6"
      >
        <CloseOutlined aria-hidden />
      </Button>
    </Dialog.Close>
  );
}

function ModalFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="modal-footer"
      className={cn("grid grid-cols-2 gap-2.5 pt-1.5 *:w-full *:rounded-lg", className)}
      {...props}
    />
  );
}

export { Modal, ModalClose, ModalFooter };
