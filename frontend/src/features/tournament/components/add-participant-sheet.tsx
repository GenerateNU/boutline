"use client";

import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useState } from "react";

import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { useToast } from "@/components/primitives/toast";
import { ImportDropzone } from "@/features/tournament/components/import-dropzone";

type Participant = {
  name: string;
  pool: string;
};

type AddParticipantSheetProps = {
  role: "Fencer" | "Referee";
  trigger: React.ReactNode;
  onAdd?: (participant: Participant) => void;
};

function AddParticipantSheet({ role, trigger, onAdd }: AddParticipantSheetProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  // No backend yet: the caller keeps the added participant in local state, if at all.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const participant = { name: String(form.get("name")), pool: String(form.get("pool")) };
    onAdd?.(participant);
    toast({ description: `Added ${participant.name}` });
    setOpen(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-foreground/40" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 mx-auto flex w-full max-w-mobile flex-col gap-5 rounded-t-3xl bg-background px-6 pt-8 pb-8 font-satoshi">
          <Dialog.Title className="text-xl font-medium">Add {role}s</Dialog.Title>
          <Dialog.Description className="sr-only">
            Upload a file or add a {role.toLowerCase()} by hand
          </Dialog.Description>
          <Dialog.Close asChild>
            <Button
              type="button"
              variant="text"
              size="icon"
              aria-label="Close"
              className="absolute top-5 right-4"
            >
              <X />
            </Button>
          </Dialog.Close>

          <ImportDropzone />

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <h3 className="text-xl font-medium">Manually add</h3>
            <label className="flex flex-col gap-2 text-sm">
              Name
              <Input variant="filled" name="name" required />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Pool
              <Input variant="filled" name="pool" inputMode="numeric" />
            </label>
            <Button type="submit" variant="tonal" className="mt-3 h-12 rounded-full">
              Add {role}
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { AddParticipantSheet };
export type { Participant };
