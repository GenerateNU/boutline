"use client";

import { cn } from "cn";
import { useRef, useState } from "react";

import { buttonVariants } from "@/components/primitives/button";
import { FilterSearchField } from "@/components/primitives/filter-search-field";
import { FilterSheetDialog } from "@/components/primitives/filter-sheet-dialog";
import {
  SegmentedButton,
  SegmentedButtonItem,
} from "@/components/primitives/segmented-button";
import { Slider } from "@/components/primitives/slider";
import { ClubOptions } from "@/features/competitor/components/club-options";
import { statusLabels } from "@/features/tournament/components/tournament-status-badge";
import { useTournamentFilters } from "@/features/tournament/hooks/use-tournament-filters";
import { countryName } from "@/features/tournament/lib/country-name";
import { countryCodePattern } from "@/features/tournament/lib/tournament-filters";
import type {
  TournamentStatus,
  TournamentVisibility,
} from "@/features/tournament/types/tournament";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";
import { apiRequest } from "@/services/api-request";
import type { Team, TeamListResult } from "@/types/competitor";

const maxDistance = 100;
const statusOrder: TournamentStatus[] = ["ended", "active", "pending"];

const debounceMs = 300;
const clubResultLimit = 10;
const chipClassName = cn(
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
  const [clubs, setClubs] = useState<Team[] | null>(null);
  const [clubsFailed, setClubsFailed] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [countries, setCountries] = useState<Country[] | null>(null);
  const [countriesFailed, setCountriesFailed] = useState(false);
  const [countryTerm, setCountryTerm] = useState("");
  const latestRequestId = useRef(0);

  async function searchClubs(term: string) {
    // Typing fires overlapping requests whose responses can arrive out of
    // order, so each gets an id and only the newest one may update the list.
    const requestId = ++latestRequestId.current;
    const query = new URLSearchParams({ limit: String(clubResultLimit) });
    if (term) {
      query.set("q", term);
    }
    try {
      const result = await apiRequest<TeamListResult>(`/clubs?${query}`);
      if (requestId !== latestRequestId.current) {
        return;
      }
      setClubs(result.data);
      setClubsFailed(false);
    } catch {
      if (requestId !== latestRequestId.current) {
        return;
      }
      setClubsFailed(true);
    }
  }

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

  const [debouncedSearchClubs, cancelClubSearch] = useDebouncedCallback(searchClubs, debounceMs);

  // The active club may not be in the current results, and it needs a chip so
  // it can be seen and cleared. ClubOptions only reads the name.
  const selectedClubMissing =
    clubs !== null && selectedClub !== "" && !clubs.some(({ name }) => name === selectedClub);
  const shownClubs = selectedClubMissing
    ? [{ name: selectedClub, competitorCount: 0 }, ...clubs]
    : clubs;

  const shownCountries =
    countries &&
    countries.filter(({ code }) => countryName(code).toLowerCase().includes(countryTerm));

  return (
    <FilterSheetDialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setStatus(searchParams.get("status") ?? "");
          setSelectedClub(searchParams.get("club") ?? "");
          setSelectedCountry(searchParams.get("country") ?? "");
          setCountryTerm("");
          void searchClubs("");
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
        setCountryTerm("");
        // The form reset empties the club searchbox, so the list must match it.
        cancelClubSearch();
        void searchClubs("");
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
      <FilterSearchField
        label="Country"
        onChange={(event) => setCountryTerm(event.target.value.trim().toLowerCase())}
      >
        <CountryOptions
          countries={shownCountries}
          failed={countriesFailed}
          selectedCountry={selectedCountry}
          onSelectCountry={setSelectedCountry}
        />
      </FilterSearchField>

      <FilterSearchField
        label="Club"
        onChange={(event) => debouncedSearchClubs(event.target.value.trim())}
      >
        <ClubOptions
          clubs={shownClubs}
          failed={clubsFailed}
          selectedClub={selectedClub}
          onToggleClub={(name) => setSelectedClub(name === selectedClub ? "" : name)}
        />
      </FilterSearchField>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-obsidian">Distance</p>
        <div className="flex flex-col gap-2 px-5 py-2">
          <Slider
            aria-label="Distance"
            max={maxDistance}
            defaultValue={[maxDistance / 2]}
          />
          <p className="flex justify-between text-[11px] leading-4 font-semibold tracking-[0.88px] text-obsidian uppercase">
            <span>0 mi</span>
            <span>{maxDistance} mi</span>
          </p>
        </div>
      </div>

      <ChipGroup label="Tournament Status" value={status} onValueChange={setStatus}>
        {statusOrder.map((value) => (
          <SegmentedButtonItem key={value} value={value} className={cn(chipClassName, "flex-1")}>
            {statusLabels[value]}
          </SegmentedButtonItem>
        ))}
      </ChipGroup>
    </FilterSheetDialog>
  );
}

interface CountryOptionsProps {
  countries: Country[] | null;
  failed: boolean;
  selectedCountry: string;
  onSelectCountry: (code: string) => void;
}

function CountryOptions({ countries, failed, selectedCountry, onSelectCountry }: CountryOptionsProps) {
  if (failed) {
    return <p className="text-sm text-muted-foreground">Couldn’t load countries.</p>;
  }
  if (countries === null) {
    return null;
  }
  if (countries.length === 0) {
    return <p className="text-sm text-muted-foreground">No countries match.</p>;
  }
  return (
    <SegmentedButton
      type="single"
      aria-label="Countries"
      value={selectedCountry}
      onValueChange={onSelectCountry}
      className="flex flex-wrap gap-2 overflow-visible rounded-none border-0 pt-1"
    >
      {countries.map(({ code }) => (
        <SegmentedButtonItem key={code} value={code} className={chipClassName}>
          {countryName(code)}
        </SegmentedButtonItem>
      ))}
    </SegmentedButton>
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
