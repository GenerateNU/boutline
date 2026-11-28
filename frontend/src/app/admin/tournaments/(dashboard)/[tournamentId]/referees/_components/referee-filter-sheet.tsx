"use client";

import { useState } from "react";

import { Chip } from "@/components/primitives/chip";
import { FilterSearchField } from "@/components/primitives/filter-search-field";
import { FilterSheetDialog } from "@/components/primitives/filter-sheet-dialog";
import { SelectField } from "@/components/primitives/select-field";
import type { RefereeResponse } from "@/features/referee/types/referee";
import { useTournamentFilters } from "@/features/tournament/hooks/use-tournament-filters";
import { useFilterSearch } from "@/lib/hooks/use-filter-search";
import { apiRequest } from "@/services/api-request";
import type { ListResponse } from "@/types/list-response";

import type { PoolOption } from "../_services/get-tournament-pools";

const SUGGESTION_LIMIT = 10;

interface RefereeFilterSheetProps {
  tournamentId: string;
  // Only the tournament's admins can see or search referees' emails.
  canSeeEmails: boolean;
  pools: PoolOption[];
}

function RefereeFilterSheet({ tournamentId, canSeeEmails, pools }: RefereeFilterSheetProps) {
  const { searchParams, setFilters } = useTournamentFilters();
  const [open, setOpen] = useState(false);
  const [poolId, setPoolId] = useState("");

  async function searchReferees(params: Record<string, string>) {
    const query = new URLSearchParams({ role: "referee", limit: String(SUGGESTION_LIMIT), ...params });
    const { data } = await apiRequest<ListResponse<RefereeResponse>>(
      `/tournaments/${encodeURIComponent(tournamentId)}/users?${query}`,
    );
    return data;
  }

  const refereeField = useFilterSearch(async (term) =>
    (await searchReferees({ q: term })).map(({ first_name, last_name }) => {
      const name = `${first_name} ${last_name}`;
      return { value: name, label: name };
    }),
  );
  const emailField = useFilterSearch(async (term) =>
    (await searchReferees({ email: term })).flatMap(({ email }) => (email ? [{ value: email, label: email }] : [])),
  );

  const activeTags = [
    { name: "Referee", value: refereeField.value, clear: () => refereeField.reset() },
    { name: "Email", value: emailField.value, clear: () => emailField.reset() },
    { name: "Pool", value: pools.find(({ id }) => id === poolId)?.label, clear: () => setPoolId("") },
  ].filter((tag) => tag.value);

  return (
    <FilterSheetDialog
      open={open}
      onOpenChange={(next) => {
        // Each open starts from the filters in the URL, so closing without
        // "Show Referees" throws the unsaved picks away.
        if (next) {
          refereeField.reset(searchParams.get("q") ?? "");
          emailField.reset(searchParams.get("email") ?? "");
          setPoolId(searchParams.get("pool") ?? "");
        }
        setOpen(next);
      }}
      triggerLabel="Filter referees"
      description="Narrow the referee list"
      submitLabel="Show Referees"
      onReset={() => {
        refereeField.reset();
        emailField.reset();
        setPoolId("");
      }}
      onSubmit={() => {
        setFilters({
          q: refereeField.submitValue(),
          email: canSeeEmails ? emailField.submitValue() : undefined,
          pool: poolId || undefined,
        });
        setOpen(false);
      }}
    >
      {activeTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeTags.map((tag) => (
            <Chip key={tag.name} onDismiss={tag.clear} dismissLabel={`Remove ${tag.name}: ${tag.value}`}>
              {tag.name}: {tag.value}
            </Chip>
          ))}
        </div>
      )}

      <FilterSearchField
        label="Referee"
        placeholder="Search referees"
        value={refereeField.query}
        onChange={(event) => refereeField.change(event.target.value)}
        suggestions={refereeField.suggestions}
        failed={refereeField.failed}
        loading={refereeField.loading}
        selected={refereeField.value}
        onPick={refereeField.pick}
        onCommitText={refereeField.commitText}
        maxLength={120}
        noun="referees"
      />
      {canSeeEmails && (
        <FilterSearchField
          label="Email"
          placeholder="Search emails"
          value={emailField.query}
          onChange={(event) => emailField.change(event.target.value)}
          suggestions={emailField.suggestions}
          failed={emailField.failed}
          loading={emailField.loading}
          selected={emailField.value}
          onPick={emailField.pick}
          onCommitText={emailField.commitText}
          maxLength={254}
          noun="emails"
        />
      )}
      <SelectField
        label="Pool"
        name="pool"
        placeholder={pools.length === 0 ? "No pools yet" : "Select a pool"}
        options={pools.map(({ id, label }) => ({ value: id, label }))}
        value={poolId}
        onValueChange={setPoolId}
        disabled={pools.length === 0}
      />
    </FilterSheetDialog>
  );
}

export { RefereeFilterSheet };
