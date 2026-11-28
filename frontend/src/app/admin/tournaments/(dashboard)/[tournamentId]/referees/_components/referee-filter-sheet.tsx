"use client";

import { useState } from "react";

import { Chip } from "@/components/primitives/chip";
import { FilterSearchField } from "@/components/primitives/filter-search-field";
import { FilterSheetDialog } from "@/components/primitives/filter-sheet-dialog";
import type { RefereeResponse } from "@/features/referee/types/referee";
import { useTournamentFilters } from "@/features/tournament/hooks/use-tournament-filters";
import { useFilterSearch } from "@/lib/hooks/use-filter-search";
import { apiRequest } from "@/services/api-request";
import type { ListResponse } from "@/types/list-response";

const SUGGESTION_LIMIT = 10;

// A pool filter is a pool number; anything else is dropped rather than sent.
function poolNumber(text: string | undefined) {
  const number = Number(text?.trim());
  return Number.isInteger(number) && number > 0 ? String(number) : undefined;
}

interface RefereeFilterSheetProps {
  tournamentId: string;
  // Only the tournament's admins can see or search referees' emails.
  canSeeEmails: boolean;
}

function RefereeFilterSheet({ tournamentId, canSeeEmails }: RefereeFilterSheetProps) {
  const { searchParams, setFilters } = useTournamentFilters();
  const [open, setOpen] = useState(false);

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
  const poolField = useFilterSearch(async (term) => {
    const number = poolNumber(term);
    return number ? [{ value: number, label: `Pool ${number}` }] : [];
  });

  const activeTags = [
    { name: "Referee", value: refereeField.value, clear: () => refereeField.reset() },
    { name: "Email", value: emailField.value, clear: () => emailField.reset() },
    { name: "Pool", value: poolField.value, clear: () => poolField.reset() },
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
          poolField.reset(searchParams.get("pool") ?? "");
        }
        setOpen(next);
      }}
      triggerLabel="Filter referees"
      description="Narrow the referee list"
      submitLabel="Show Referees"
      onReset={() => {
        refereeField.reset();
        emailField.reset();
        poolField.reset();
      }}
      onSubmit={() => {
        setFilters({
          q: refereeField.submitValue(),
          email: canSeeEmails ? emailField.submitValue() : undefined,
          pool: poolNumber(poolField.submitValue()),
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
      <FilterSearchField
        label="Pool"
        placeholder="Search pools"
        inputMode="numeric"
        value={poolField.query}
        onChange={(event) => poolField.change(event.target.value)}
        suggestions={poolField.suggestions}
        failed={poolField.failed}
        loading={poolField.loading}
        selected={poolField.value}
        onPick={poolField.pick}
        onCommitText={poolField.commitText}
        noun="pools"
      />
    </FilterSheetDialog>
  );
}

export { RefereeFilterSheet };
