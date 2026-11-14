"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/primitives/button";
import { Modal, ModalFooter } from "@/components/primitives/modal";
import { useToast } from "@/components/primitives/toast";
import { RefereeCard, type Referee } from "@/features/referee/components/referee-card";
import type { TournamentEvent } from "@/features/event/types/event";
import type { TournamentMember } from "@/features/referee/types/referee";
import { apiRequest } from "@/services/api-request";
import { errorMessage } from "@/utils/error-message";

import { AddRefereeDialog } from "./add-referee-dialog";

function toReferee({ user_id, first_name, last_name, occupied, pool_number }: TournamentMember): Referee {
  return {
    id: user_id,
    name: `${first_name} ${last_name}`,
    occupied,
    pool: pool_number === null ? undefined : `Pool ${pool_number}`,
  };
}

interface RefereeRosterProps {
  tournamentId: string;
  referees: TournamentMember[];
  events: TournamentEvent[];
}

function RefereeRoster({ tournamentId, referees, events }: RefereeRosterProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [refereeToRemove, setRefereeToRemove] = useState<Referee | null>(null);
  const [pending, startTransition] = useTransition();
  const addButton = useRef<HTMLButtonElement>(null);
  const rows = referees.map(toReferee);

  function confirmRemove() {
    if (!refereeToRemove) {
      return;
    }
    const { id, name } = refereeToRemove;
    startTransition(async () => {
      try {
        await apiRequest(
          `/tournaments/${encodeURIComponent(tournamentId)}/users/${encodeURIComponent(id)}`,
          { method: "DELETE" },
        );
        router.refresh();
        toast({ description: `Removed ${name}` });
      } catch (err) {
        toast({ description: errorMessage(err) });
      }
      setRefereeToRemove(null);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Button ref={addButton} className="self-start" onClick={() => setAddOpen(true)}>
        Add Referees
      </Button>
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-secondary">No referees yet.</p>
      ) : (
        <RefereeCard
          referees={rows}
          onRemove={(id) => setRefereeToRemove(rows.find((row) => row.id === id) ?? null)}
        />
      )}
      <AddRefereeDialog
        tournamentId={tournamentId}
        events={events}
        open={addOpen}
        onOpenChange={setAddOpen}
        returnFocusTo={addButton}
      />
      <Modal
        open={refereeToRemove !== null}
        onOpenChange={(open) => !open && setRefereeToRemove(null)}
        title="Remove referee?"
        description={`${refereeToRemove?.name ?? ""} will no longer be a referee for this tournament.`}
        // The removed row is gone by the time this closes, so focus goes back to Add Referees.
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          addButton.current?.focus();
        }}
      >
        <ModalFooter>
          <Button type="button" variant="outline" onClick={() => setRefereeToRemove(null)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={pending} onClick={confirmRemove}>
            Remove
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export { RefereeRoster };
