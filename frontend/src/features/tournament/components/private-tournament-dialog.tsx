"use client";

import CloseOutlined from "@mui/icons-material/CloseOutlined";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Dialog } from "radix-ui";

import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import type { Tournament } from "@/features/tournament/types/tournament";
import { apiRequest } from "@/services/api-request";

type PrivateTournamentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusTo: React.RefObject<HTMLElement | null>;
};

function PrivateTournamentDialog({
  open,
  onOpenChange,
  returnFocusTo,
}: PrivateTournamentDialogProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const request = useRef<AbortController | null>(null);

  function handleOpenChange(next: boolean) {
    request.current?.abort();
    setError(null);
    onOpenChange(next);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code")).trim();
    const controller = new AbortController();
    request.current = controller;

    startTransition(async () => {
      try {
        const tournament = await apiRequest<Tournament>(
          `/tournaments/code/${encodeURIComponent(code)}`,
          { signal: controller.signal },
        );
        handleOpenChange(false);
        router.push(`/tournaments/${tournament.id}`);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Tournament not found");
        }
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-obsidian/40" />
        <Dialog.Content
          // There's no Dialog.Trigger to return focus to, so Radix would drop it on <body>.
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusTo.current?.focus();
          }}
          className="fixed inset-x-2 top-1/2 z-50 mx-auto flex max-w-86.25 -translate-y-1/2 flex-col gap-5 rounded-3xl bg-background p-5 pt-6 font-manrope shadow-lg"
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-xl font-semibold text-obsidian">
              Private tournament
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button
                variant="text"
                size="icon"
                aria-label="Close"
                className="-m-2 text-obsidian [&_svg]:size-6"
              >
                <CloseOutlined />
              </Button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="-mt-1 text-sm text-neutral-secondary">
            Enter the code from your tournament organizer.
          </Dialog.Description>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <Input
              name="code"
              aria-label="Tournament code"
              placeholder="Tournament code"
              required
              minLength={6}
              autoComplete="off"
              className="h-11.5 rounded-[12px] border-outline px-4 text-obsidian uppercase shadow-sm placeholder:text-neutral-secondary placeholder:normal-case"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2.5 pt-1.5">
              <Dialog.Close asChild>
                <Button type="button" variant="outline" className="flex-1 rounded-lg">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={pending} className="flex-1 rounded-lg">
                Submit
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { PrivateTournamentDialog };
