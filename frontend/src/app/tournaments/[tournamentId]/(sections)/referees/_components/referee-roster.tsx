"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/primitives/button";
import { Modal, ModalFooter } from "@/components/primitives/modal";
import { useToast } from "@/components/primitives/toast";
import { RefereeCard } from "@/features/referee/components/referee-card";
import type { TournamentEvent } from "@/features/event/types/event";
import type { TournamentMember } from "@/features/referee/types/referee";
import { apiRequest } from "@/services/api-request";
import { errorMessage } from "@/utils/error-message";

import { AddRefereeDialog } from "./add-referee-dialog";

interface RefereeRow {
  id: string;
  name: string;
  occupied: boolean;
  pool?: string;
}

function toRow({ user_id, first_name, last_name, occupied, pool_number }: TournamentMember): RefereeRow {
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
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<RefereeRow | null>(null);
  const [pending, startTransition] = useTransition();
  const addButton = useRef<HTMLButtonElement>(null);
  const rows = referees.map(toRow);

  function confirmRemove() {
    if (!removing) {
      return;
    }
    const { id, name } = removing;
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
      setRemoving(null);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Button ref={addButton} className="self-start" onClick={() => setAdding(true)}>
        Add Referees
      </Button>
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-secondary">No referees yet.</p>
      ) : (
        <RefereeCard
          referees={rows}
          onRemove={(id) => setRemoving(rows.find((row) => row.id === id) ?? null)}
        />
      )}
      <AddRefereeDialog
        tournamentId={tournamentId}
        events={events}
        open={adding}
        onOpenChange={setAdding}
        returnFocusTo={addButton}
      />
      <Modal
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Remove referee?"
        description={`${removing?.name ?? ""} will no longer be a referee for this tournament.`}
        // The removed row is gone by the time this closes, so focus goes back to Add Referees.
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          addButton.current?.focus();
        }}
      >
        <ModalFooter>
          <Button type="button" variant="outline" onClick={() => setRemoving(null)}>
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
