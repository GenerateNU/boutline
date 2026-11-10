"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/primitives/button";
import { Modal, ModalFooter } from "@/components/primitives/modal";
import { TextField } from "@/components/primitives/text-field";
import type { Tournament } from "@/features/tournament/types/tournament";
import { apiRequest } from "@/services/api-request";

interface PrivateTournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusTo: React.RefObject<HTMLElement | null>;
}

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
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title="Private tournament"
      description="Enter the code from your tournament organizer."
      // There's no Dialog.Trigger to return focus to, so Radix would drop it on <body>.
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        returnFocusTo.current?.focus();
      }}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          name="code"
          aria-label="Tournament code"
          placeholder="Tournament code"
          required
          minLength={6}
          autoComplete="off"
          aria-invalid={error !== null}
          supportingText={error}
        />
        <ModalFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            Submit
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export { PrivateTournamentDialog };
