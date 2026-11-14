"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/primitives/button";
import { Chip } from "@/components/primitives/chip";
import { FilterSearchField } from "@/components/primitives/filter-search-field";
import { Modal, ModalFooter } from "@/components/primitives/modal";
import { SelectField, type SelectOption } from "@/components/primitives/select-field";
import { useToast } from "@/components/primitives/toast";
import type { AuthUser } from "@/features/auth/types/auth";
import type { TournamentEvent } from "@/features/event/types/event";
import { useSearchSuggestions } from "@/lib/hooks/use-search-suggestions";
import { ApiError, apiRequest } from "@/services/api-request";
import type { ListResponse } from "@/types/list-response";
import { errorMessage } from "@/utils/error-message";

const SUGGESTION_LIMIT = 10;
// The backend's maximum page size; no event has anywhere near this many pools.
const POOL_LIMIT = 100;

interface UserSuggestion {
  value: string;
  label: string;
  name: string;
}

interface EventPool {
  id: string;
  number: number;
}

function toSuggestion({ id, firstName, lastName, email }: AuthUser): UserSuggestion {
  const name = `${firstName} ${lastName}`;
  return { value: id, label: `${name} · ${email}`, name };
}

function toEventOption({ id, name }: TournamentEvent): SelectOption {
  return { value: id, label: name };
}

function toPoolOption({ id, number }: EventPool): SelectOption {
  return { value: id, label: `Pool ${number}` };
}

async function addReferee(tournamentId: string, userId: string, assigningPool: boolean) {
  try {
    await apiRequest(`/tournaments/${encodeURIComponent(tournamentId)}/users`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId, role: "referee" }),
    });
  } catch (err) {
    // Someone already on the staff can still be given a pool.
    if (!(assigningPool && err instanceof ApiError && err.status === 409)) {
      throw err;
    }
  }
}

interface AddRefereeDialogProps {
  tournamentId: string;
  events: TournamentEvent[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusTo: React.RefObject<HTMLElement | null>;
}

function AddRefereeDialog({ tournamentId, events, open, onOpenChange, returnFocusTo }: AddRefereeDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [picked, setPicked] = useState<UserSuggestion | null>(null);
  const [eventId, setEventId] = useState("");
  const [pools, setPools] = useState<EventPool[]>([]);
  const [poolId, setPoolId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const search = useSearchSuggestions(async (term) => {
    const query = new URLSearchParams({ q: term, limit: String(SUGGESTION_LIMIT) });
    const result = await apiRequest<ListResponse<AuthUser>>(`/users?${query}`);
    return result.data.map(toSuggestion);
  });

  useEffect(() => {
    if (!eventId) {
      return;
    }
    let ignore = false;
    const query = new URLSearchParams({ event_id: eventId, limit: String(POOL_LIMIT) });
    apiRequest<ListResponse<EventPool>>(`/pool-sheets?${query}`)
      .then((result) => {
        if (!ignore) {
          setPools(result.data);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(errorMessage(err));
        }
      });
    return () => {
      ignore = true;
    };
  }, [eventId]);

  function chooseEvent(id: string) {
    setEventId(id);
    setPools([]);
    setPoolId("");
  }

  function handleOpenChange(next: boolean) {
    setPicked(null);
    chooseEvent("");
    setError(null);
    search.clear();
    onOpenChange(next);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!picked) {
      return;
    }
    setError(null);
    const pool = pools.find(({ id }) => id === poolId);

    startTransition(async () => {
      try {
        await addReferee(tournamentId, picked.value, Boolean(pool));
        if (pool) {
          await apiRequest(`/pools/${encodeURIComponent(pool.id)}`, {
            method: "PATCH",
            body: JSON.stringify({ referee_id: picked.value }),
          });
        }
        router.refresh();
        toast({
          description: pool
            ? `Added ${picked.name} as the referee for Pool ${pool.number}`
            : `Added ${picked.name} as a referee`,
        });
        handleOpenChange(false);
      } catch (err) {
        setError(errorMessage(err));
      }
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title="Add Referees"
      description="Search by name or email."
      // There's no Dialog.Trigger to return focus to, so Radix would drop it on <body>.
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        returnFocusTo.current?.focus();
      }}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {picked && (
          <div className="flex flex-wrap gap-2">
            <Chip onDismiss={() => setPicked(null)} dismissLabel={`Remove ${picked.name}`}>
              {picked.label}
            </Chip>
          </div>
        )}
        <FilterSearchField
          label="Referee"
          placeholder="Search by name or email"
          value={search.query}
          onChange={(event) => search.change(event.target.value)}
          suggestions={search.suggestions}
          failed={search.failed}
          loading={search.loading}
          selected={picked?.value ?? ""}
          onPick={(id) => {
            setPicked(search.suggestions?.find(({ value }) => value === id) ?? null);
            search.clear();
          }}
          noun="users"
        />
        <SelectField
          label="Event"
          name="event"
          placeholder="Optional"
          options={events.map(toEventOption)}
          value={eventId}
          onValueChange={chooseEvent}
          disabled={events.length === 0}
        />
        <SelectField
          label="Pool"
          name="pool"
          placeholder={eventId && pools.length === 0 ? "No pools yet" : "e.g. Pool 1"}
          options={pools.map(toPoolOption)}
          value={poolId}
          onValueChange={setPoolId}
          disabled={pools.length === 0}
        />
        {error && (
          <p role="alert" className="text-sm text-red-dark">
            {error}
          </p>
        )}
        <ModalFooter className="grid-cols-1">
          <Button type="submit" disabled={!picked || pending}>
            Add Referee
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export { AddRefereeDialog };
