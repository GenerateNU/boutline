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

interface PoolSheet {
  id: string;
  number: number;
  status: "upcoming" | "active" | "ended";
}

interface TournamentPool extends PoolSheet {
  eventName: string;
}

function toSuggestion({ id, firstName, lastName, email }: AuthUser): UserSuggestion {
  const name = `${firstName} ${lastName}`;
  return { value: id, label: `${name} · ${email}`, name };
}

// Pool numbers repeat across events, so each label names its event.
function poolLabel({ number, eventName }: TournamentPool) {
  return `Pool ${number} · ${eventName}`;
}

function toPoolOption(pool: TournamentPool): SelectOption {
  return { value: pool.id, label: poolLabel(pool) };
}

function poolPlaceholder(pools: TournamentPool[] | null) {
  if (pools === null) {
    return "Loading pools…";
  }
  return pools.length === 0 ? "No pools yet" : "eg. 1,2,3,4...";
}

async function fetchEventPools({ id, name }: TournamentEvent): Promise<TournamentPool[]> {
  const query = new URLSearchParams({ event_id: id, limit: String(POOL_LIMIT) });
  const result = await apiRequest<ListResponse<PoolSheet>>(`/pool-sheets?${query}`);
  // A pool that has started can't change referee, so only upcoming ones are offered.
  return result.data
    .filter((pool) => pool.status === "upcoming")
    .map((pool) => ({ ...pool, eventName: name }));
}

async function fetchTournamentPools(events: TournamentEvent[]) {
  const poolsByEvent = await Promise.all(events.map(fetchEventPools));
  return poolsByEvent.flat();
}

// allowExisting: when a pool is being assigned, someone already on the staff is fine.
async function addToStaff(tournamentId: string, userId: string, allowExisting: boolean) {
  try {
    await apiRequest(`/tournaments/${encodeURIComponent(tournamentId)}/users`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId, role: "referee" }),
    });
  } catch (err) {
    if (!(allowExisting && err instanceof ApiError && err.status === 409)) {
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
  const [pickedUser, setPickedUser] = useState<UserSuggestion | null>(null);
  // null while the pools are loading.
  const [pools, setPools] = useState<TournamentPool[] | null>(null);
  const [poolId, setPoolId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const userSearch = useSearchSuggestions(async (term) => {
    const query = new URLSearchParams({ q: term, limit: String(SUGGESTION_LIMIT) });
    const result = await apiRequest<ListResponse<AuthUser>>(`/users?${query}`);
    return result.data.map(toSuggestion);
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    let ignore = false;
    fetchTournamentPools(events)
      .then((found) => {
        if (!ignore) {
          setPools(found);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setPools([]);
          setError(errorMessage(err));
        }
      });
    return () => {
      ignore = true;
    };
  }, [open, events]);

  function handleOpenChange(next: boolean) {
    setPickedUser(null);
    setPools(null);
    setPoolId("");
    setError(null);
    userSearch.clear();
    onOpenChange(next);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pickedUser) {
      return;
    }
    setError(null);
    const selectedPool = pools?.find(({ id }) => id === poolId);

    startTransition(async () => {
      try {
        await addToStaff(tournamentId, pickedUser.value, Boolean(selectedPool));
        if (selectedPool) {
          await apiRequest(`/pools/${encodeURIComponent(selectedPool.id)}`, {
            method: "PATCH",
            body: JSON.stringify({ referee_id: pickedUser.value }),
          });
        }
        router.refresh();
        toast({
          description: selectedPool
            ? `Added ${pickedUser.name} as the referee for ${poolLabel(selectedPool)}`
            : `Added ${pickedUser.name} as a referee`,
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
        {pickedUser && (
          <div className="flex flex-wrap gap-2">
            <Chip onDismiss={() => setPickedUser(null)} dismissLabel={`Remove ${pickedUser.name}`}>
              {pickedUser.label}
            </Chip>
          </div>
        )}
        <FilterSearchField
          label="Referee"
          placeholder="Search by name or email"
          value={userSearch.query}
          onChange={(event) => userSearch.change(event.target.value)}
          suggestions={userSearch.suggestions}
          failed={userSearch.failed}
          loading={userSearch.loading}
          selected={pickedUser?.value ?? ""}
          onPick={(id) => {
            setPickedUser(userSearch.suggestions?.find(({ value }) => value === id) ?? null);
            userSearch.clear();
          }}
          noun="users"
        />
        <SelectField
          label="Pool"
          name="pool"
          placeholder={poolPlaceholder(pools)}
          options={(pools ?? []).map(toPoolOption)}
          value={poolId}
          onValueChange={setPoolId}
          disabled={!pools?.length}
        />
        {error && (
          <p role="alert" className="text-sm text-red-dark">
            {error}
          </p>
        )}
        <ModalFooter className="grid-cols-1">
          <Button type="submit" disabled={!pickedUser || pending}>
            Add Referee
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export { AddRefereeDialog };
