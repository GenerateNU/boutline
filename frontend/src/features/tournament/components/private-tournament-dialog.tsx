"use client";

import { X } from "lucide-react";
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
};

function PrivateTournamentDialog({ open, onOpenChange }: PrivateTournamentDialogProps) {
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
        <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/20" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-4 top-1/2 z-50 mx-auto flex max-w-88 -translate-y-1/2 flex-col gap-5 rounded-xl border border-foreground bg-background px-5 pt-5 pb-8"
        >
          <Dialog.Close asChild>
            <Button variant="text" size="icon" aria-label="Close" className="-m-2">
              <X className="size-6!" />
            </Button>
          </Dialog.Close>
          <Dialog.Title className="text-center text-xl">Enter Private Tournament Code:</Dialog.Title>
          <form onSubmit={handleSubmit} className="flex flex-col items-center gap-5">
            <Input
              name="code"
              aria-label="Tournament code"
              required
              minLength={6}
              autoComplete="off"
              className="rounded-none uppercase"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={pending} className="rounded-lg">
              Submit
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { PrivateTournamentDialog };
