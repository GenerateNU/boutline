"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/primitives/button";
import { Chip } from "@/components/primitives/chip";
import { FilterSearchField } from "@/components/primitives/filter-search-field";
import { Modal, ModalFooter } from "@/components/primitives/modal";
import { SelectField } from "@/components/primitives/select-field";
import { useToast } from "@/components/primitives/toast";
import type { AuthUser } from "@/features/auth/types/auth";
import { useSearchSuggestions } from "@/lib/hooks/use-search-suggestions";
import { ApiError, apiRequest } from "@/services/api-request";
import type { ListResponse } from "@/types/list-response";
import { errorMessage } from "@/utils/error-message";

import type { PoolOption } from "../_services/get-tournament-pools";

const SUGGESTION_LIMIT = 10;
interface UserSuggestion {
  value: string;
  label: string;
  name: string;
}

function toSuggestion({ id, firstName, lastName, email }: AuthUser): UserSuggestion {
  const name = `${firstName} ${lastName}`;
  return { value: id, label: `${name} · ${email}`, name };
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
  // Every pool of the tournament; only upcoming ones can take a referee.
  pools: PoolOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusTo: React.RefObject<HTMLElement | null>;
}

function AddRefereeDialog({ tournamentId, pools, open, onOpenChange, returnFocusTo }: AddRefereeDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pickedUser, setPickedUser] = useState<UserSuggestion | null>(null);
  const [poolId, setPoolId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Search-as-you-type over users by name or email.
  const userSearch = useSearchSuggestions(async (term) => {
    const query = new URLSearchParams({ q: term, limit: String(SUGGESTION_LIMIT) });
    const result = await apiRequest<ListResponse<AuthUser>>(`/users?${query}`);
    return result.data.map(toSuggestion);
  });

  const upcomingPools = pools.filter(({ upcoming }) => upcoming);

  // Opening or closing always starts from a blank form.
  function handleOpenChange(next: boolean) {
    setPickedUser(null);
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
    const selectedPool = upcomingPools.find(({ id }) => id === poolId);

    // Add them to the staff, then put them on the pool if one was picked.
    startTransition(async () => {
      try {
        await addToStaff(tournamentId, pickedUser.value, Boolean(selectedPool));
        if (selectedPool) {
          await apiRequest(`/pools/${encodeURIComponent(selectedPool.id)}`, {
            method: "PATCH",
            body: JSON.stringify({ referee_id: pickedUser.value }),
          });
        }
        // Re-fetch the server-rendered roster so the new referee shows up.
        router.refresh();
        toast({
          description: selectedPool
            ? `Added ${pickedUser.name} as the referee for ${selectedPool.label}`
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
          placeholder={upcomingPools.length === 0 ? "No pools yet" : "eg. 1,2,3,4..."}
          options={upcomingPools.map(({ id, label }) => ({ value: id, label }))}
          value={poolId}
          onValueChange={setPoolId}
          disabled={upcomingPools.length === 0}
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
