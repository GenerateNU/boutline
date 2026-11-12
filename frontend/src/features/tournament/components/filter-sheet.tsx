"use client";

import { cn } from "cn";
import { useState } from "react";

import { buttonVariants } from "@/components/primitives/button";
import { Chip } from "@/components/primitives/chip";
import { FilterSearchField } from "@/components/primitives/filter-search-field";
import { FilterSheetDialog } from "@/components/primitives/filter-sheet-dialog";
import {
  SegmentedButton,
  SegmentedButtonItem,
} from "@/components/primitives/segmented-button";
import { Slider } from "@/components/primitives/slider";
import { statusLabels } from "@/features/tournament/components/tournament-status-badge";
import { useTournamentFilters } from "@/features/tournament/hooks/use-tournament-filters";
import { countryName } from "@/features/tournament/lib/country-name";
import { COUNTRY_CODE_PATTERN } from "@/features/tournament/lib/tournament-filters";
import type {
  TournamentStatus,
  TournamentVisibility,
} from "@/features/tournament/types/tournament";
import { useSearchSuggestions } from "@/lib/hooks/use-search-suggestions";
import { apiRequest } from "@/services/api-request";
import type { TeamListResult } from "@/types/competitor";

const MAX_DISTANCE = 100;
const STATUS_ORDER: TournamentStatus[] = ["ended", "active", "pending"];

const CLUB_RESULT_LIMIT = 10;
const CHIP_CLASS_NAME = cn(
  buttonVariants({ variant: "outline", size: "sm" }),
  "flex-none rounded-lg first:border-l data-[state=on]:bg-blue data-[state=on]:text-white data-[state=on]:hover:bg-blue-dark",
);

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
  const [selectedClub, setSelectedClub] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [countries, setCountries] = useState<Country[] | null>(null);
  const [countriesFailed, setCountriesFailed] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");
  const clubSearch = useSearchSuggestions(async (term) => {
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
          setSelectedClub(searchParams.get("club") ?? "");
          setSelectedCountry(searchParams.get("country") ?? "");
          setCountryQuery("");
          clubSearch.clear();
          void loadCountries();
        }
        setOpen(next);
      }}
      triggerLabel="Filter tournaments"
      description="Narrow the tournament list"
      submitLabel="Show Tournaments"
      onReset={() => {
        setStatus("");
        setSelectedClub("");
        setSelectedCountry("");
        setCountryQuery("");
        clubSearch.clear();
      }}
      onSubmit={() => {
        setFilters({
          status,
          club: selectedClub || undefined,
          country: selectedCountry || undefined,
        });
        setOpen(false);
      }}
    >
      {/* Picking a suggestion empties its search box, so the picks show here until submitted. */}
      {(selectedCountry || selectedClub) && (
        <div className="flex flex-wrap gap-2">
          {selectedCountry && (
            <Chip
              onDismiss={() => setSelectedCountry("")}
              dismissLabel={`Remove ${countryName(selectedCountry)}`}
            >
              {countryName(selectedCountry)}
            </Chip>
          )}
          {selectedClub && (
            <Chip onDismiss={() => setSelectedClub("")} dismissLabel={`Remove ${selectedClub}`}>
              {selectedClub}
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
        value={clubSearch.query}
        onChange={(event) => clubSearch.change(event.target.value)}
        suggestions={clubSearch.suggestions}
        failed={clubSearch.failed}
        loading={clubSearch.loading}
        selected={selectedClub}
        onPick={(name) => {
          setSelectedClub(name);
          clubSearch.clear();
        }}
        noun="clubs"
      />

      <div className="flex flex-col gap-2">
        <p className="text-sm text-obsidian">Distance</p>
        <div className="px-5 pt-10 pb-2">
          <Slider aria-label="Distance" unit="mi" showValue max={MAX_DISTANCE} defaultValue={[MAX_DISTANCE / 2]} />
        </div>
      </div>

      <ChipGroup label="Tournament Status" value={status} onValueChange={setStatus}>
        {STATUS_ORDER.map((value) => (
          <SegmentedButtonItem key={value} value={value} className={cn(CHIP_CLASS_NAME, "flex-1")}>
            {statusLabels[value]}
          </SegmentedButtonItem>
        ))}
      </ChipGroup>
    </FilterSheetDialog>
  );
}

interface ChipGroupProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}

function ChipGroup({ label, value, onValueChange, children }: ChipGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-obsidian">{label}</p>
      <SegmentedButton
        type="single"
        aria-label={label}
        value={value}
        onValueChange={onValueChange}
        className="flex gap-3 overflow-visible rounded-none border-0 shadow-none"
      >
        {children}
      </SegmentedButton>
    </div>
  );
}

export { FilterSheet };
