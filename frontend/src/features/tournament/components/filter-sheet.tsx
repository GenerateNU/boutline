"use client";

import { useState } from "react";

import { Chip } from "@/components/primitives/chip";
import { ChipGroup } from "@/components/primitives/chip-group";
import { FilterSearchField } from "@/components/primitives/filter-search-field";
import { FilterSheetDialog } from "@/components/primitives/filter-sheet-dialog";
import { Slider } from "@/components/primitives/slider";
import { statusLabels } from "@/features/tournament/components/tournament-status-badge";
import { useTournamentFilters } from "@/features/tournament/hooks/use-tournament-filters";
import { countryName } from "@/features/tournament/lib/country-name";
import { COUNTRY_CODE_PATTERN } from "@/features/tournament/lib/tournament-filters";
import type { TournamentVisibility } from "@/features/tournament/types/tournament";
import { useFilterSearch } from "@/lib/hooks/use-filter-search";
import { apiRequest } from "@/services/api-request";
import type { TeamListResult } from "@/types/competitor";

const MAX_DISTANCE = 100;
const STATUS_OPTIONS = [
  { value: "ended", label: statusLabels.ended },
  { value: "active", label: statusLabels.active },
  { value: "pending", label: statusLabels.pending },
];

const CLUB_RESULT_LIMIT = 10;

interface Country {
  code: string;
  tournament_count: number;
}

interface CountryListResult {
  data: Country[];
}

interface FilterSheetProps {
  visibility?: TournamentVisibility;
}

function FilterSheet({ visibility }: FilterSheetProps) {
  const { searchParams, setFilters } = useTournamentFilters();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [countries, setCountries] = useState<Country[] | null>(null);
  const [countriesFailed, setCountriesFailed] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");
  const clubField = useFilterSearch(async (term) => {
    const query = new URLSearchParams({ limit: String(CLUB_RESULT_LIMIT), q: term });
    const result = await apiRequest<TeamListResult>(`/clubs?${query}`);
    return result.data.map(({ name }) => ({ value: name, label: name }));
  });

  async function loadCountries() {
    const query = visibility ? `?visibility=${visibility}` : "";
    try {
      const result = await apiRequest<CountryListResult>(`/countries${query}`);
      // The column itself isn't constrained, and a malformed code would make
      // Intl.DisplayNames throw mid-render.
      setCountries(result.data.filter(({ code }) => COUNTRY_CODE_PATTERN.test(code)));
      setCountriesFailed(false);
    } catch {
      setCountriesFailed(true);
    }
  }

  const countryTerm = countryQuery.trim().toLowerCase();
  const shownCountries =
    countries && countryTerm
      ? countries
          .map(({ code }) => ({ value: code, label: countryName(code) }))
          .filter(({ label }) => label.toLowerCase().includes(countryTerm))
      : null;

  return (
    <FilterSheetDialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setStatus(searchParams.get("status") ?? "");
          clubField.reset(searchParams.get("club") ?? "");
          setSelectedCountry(searchParams.get("country") ?? "");
          setCountryQuery("");
          void loadCountries();
        }
        setOpen(next);
      }}
      triggerLabel="Filter tournaments"
      description="Narrow the tournament list"
      submitLabel="Show Tournaments"
      onReset={() => {
        setStatus("");
        clubField.reset();
        setSelectedCountry("");
        setCountryQuery("");
      }}
      onSubmit={() => {
        setFilters({
          status,
          club: clubField.submitValue(),
          country: selectedCountry || undefined,
        });
        setOpen(false);
      }}
    >
      {/* Picking a suggestion empties its search box, so the picks show here until submitted. */}
      {(selectedCountry || clubField.value) && (
        <div className="flex flex-wrap gap-2">
          {selectedCountry && (
            <Chip
              onDismiss={() => setSelectedCountry("")}
              dismissLabel={`Remove ${countryName(selectedCountry)}`}
            >
              {countryName(selectedCountry)}
            </Chip>
          )}
          {clubField.value && (
            <Chip onDismiss={() => clubField.reset()} dismissLabel={`Remove ${clubField.value}`}>
              {clubField.value}
            </Chip>
          )}
        </div>
      )}

      <FilterSearchField
        label="Country"
        value={countryQuery}
        onChange={(event) => setCountryQuery(event.target.value)}
        suggestions={shownCountries}
        failed={countriesFailed && countryTerm !== ""}
        loading={countryTerm !== "" && countries === null && !countriesFailed}
        selected={selectedCountry}
        onPick={(code) => {
          setSelectedCountry(code);
          setCountryQuery("");
        }}
        noun="countries"
      />

      <FilterSearchField
        label="Club"
        value={clubField.query}
        onChange={(event) => clubField.change(event.target.value)}
        suggestions={clubField.suggestions}
        failed={clubField.failed}
        loading={clubField.loading}
        selected={clubField.value}
        onPick={clubField.pick}
        onCommitText={clubField.commitText}
        maxLength={120}
        noun="clubs"
      />

      <div className="flex flex-col gap-2">
        <p className="text-sm text-obsidian">Distance</p>
        <div className="px-5 pt-10 pb-2">
          <Slider aria-label="Distance" unit="mi" showValue max={MAX_DISTANCE} defaultValue={[MAX_DISTANCE / 2]} />
        </div>
      </div>

      <ChipGroup
        label="Tournament Status"
        value={status}
        onValueChange={setStatus}
        options={STATUS_OPTIONS}
      />
    </FilterSheetDialog>
  );
}

export { FilterSheet };
