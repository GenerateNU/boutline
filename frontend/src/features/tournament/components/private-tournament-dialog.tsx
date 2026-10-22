"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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

  function handleOpenChange(next: boolean) {
    setError(null);
    onOpenChange(next);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code")).trim();

    startTransition(async () => {
      try {
        const tournament = await apiRequest<Tournament>(
          `/tournaments/code/${encodeURIComponent(code)}`,
        );
        handleOpenChange(false);
        router.push(`/tournaments/${tournament.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Tournament not found");
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/20" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-88 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-5 rounded-xl border border-foreground bg-background px-5 pt-5 pb-8">
          <Dialog.Close asChild>
            <Button variant="text" size="icon" aria-label="Close" className="-m-2 self-start">
              <X className="size-6!" />
            </Button>
          </Dialog.Close>
          <Dialog.Title className="text-xl">Enter Private Tournament Code:</Dialog.Title>
          <Dialog.Description className="sr-only">
            Enter the join code an organizer shared with you.
          </Dialog.Description>
          <form onSubmit={handleSubmit} className="flex w-full flex-col items-center gap-5">
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
