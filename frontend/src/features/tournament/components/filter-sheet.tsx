"use client";

import { ChevronDown, Funnel } from "lucide-react";
import { ToggleGroup } from "radix-ui";
import { useState } from "react";

import { Chip, chipVariants } from "@/components/primitives/chip";
import { FilterSearchField } from "@/components/primitives/filter-search-field";
import { FilterSheetDialog } from "@/components/primitives/filter-sheet-dialog";
import { SegmentedButton } from "@/components/primitives/segmented-button";
import { statusLabels } from "@/features/tournament/components/tournament-status-badge";
import { useTournamentFilters } from "@/features/tournament/hooks/use-tournament-filters";
import { countryCodePattern } from "@/features/tournament/lib/tournament-filters";
import type {
  TournamentStatus,
  TournamentVisibility,
} from "@/features/tournament/types/tournament";
import { useSearchSuggestions } from "@/lib/hooks/use-search-suggestions";
import { apiRequest } from "@/services/api-request";
import type { TeamListResult } from "@/types/competitor";

const distances = ["10 mi", "25 mi", "50 mi", "100 mi"];
const optionClassName = chipVariants({ variant: "option" });
const statusOrder: TournamentStatus[] = ["ended", "active", "pending"];

const clubResultLimit = 10;
const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

interface Country {
  code: string;
  tournament_count: number;
}

interface CountryListResult {
  data: Country[];
}

function countryName(code: string) {
  return countryNames.of(code) ?? code;
}

interface FilterSheetProps {
  visibility?: TournamentVisibility;
}

function FilterSheet({ visibility }: FilterSheetProps) {
  const { searchParams, setFilters } = useTournamentFilters();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [distance, setDistance] = useState("");
  const [selectedClub, setSelectedClub] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [countries, setCountries] = useState<Country[] | null>(null);
  const [countriesFailed, setCountriesFailed] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");
  const clubSearch = useSearchSuggestions(async (term) => {
    const query = new URLSearchParams({ limit: String(clubResultLimit), q: term });
    const result = await apiRequest<TeamListResult>(`/clubs?${query}`);
    return result.data.map(({ name }) => ({ value: name, label: name }));
  });

  async function loadCountries() {
    const query = visibility ? `?visibility=${visibility}` : "";
    try {
      const result = await apiRequest<CountryListResult>(`/countries${query}`);
      // The column itself isn't constrained, and a malformed code would make
      // Intl.DisplayNames throw mid-render.
      setCountries(result.data.filter(({ code }) => countryCodePattern.test(code)));
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
      triggerIcon={
        <>
          <Funnel className="size-5! text-brand" />
          <ChevronDown />
        </>
      }
      description="Narrow the tournament list"
      submitLabel="Show Tournaments"
      onReset={() => {
        setStatus("");
        setDistance("");
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
        selected={selectedClub}
        onPick={(name) => {
          setSelectedClub(name);
          clubSearch.clear();
        }}
        noun="clubs"
      />

      <ChipGroup label="Distance" value={distance} onValueChange={setDistance}>
        {distances.map((value) => (
          <ToggleGroup.Item key={value} value={value} className={optionClassName}>
            {value}
          </ToggleGroup.Item>
        ))}
      </ChipGroup>

      <ChipGroup label="Tournament Status" value={status} onValueChange={setStatus}>
        {statusOrder.map((value) => (
          <ToggleGroup.Item key={value} value={value} className={optionClassName}>
            {statusLabels[value]}
          </ToggleGroup.Item>
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
      <p className="text-sm font-medium text-obsidian">{label}</p>
      <SegmentedButton
        type="single"
        aria-label={label}
        value={value}
        onValueChange={onValueChange}
        className="flex gap-2 overflow-visible rounded-none border-0 *:flex-1"
      >
        {children}
      </SegmentedButton>
    </div>
  );
}

export { FilterSheet };
