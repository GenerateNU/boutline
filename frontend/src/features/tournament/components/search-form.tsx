"use client";

import CancelOutlined from "@mui/icons-material/CancelOutlined";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import PersonOutlined from "@mui/icons-material/PersonOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Dropdown,
  DropdownMessage,
  DropdownOption,
  DropdownSection,
} from "@/components/primitives/dropdown";
import { SearchBar } from "@/components/primitives/search-bar";
import { useTournamentFilters } from "@/features/tournament/hooks/use-tournament-filters";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";
import { useSearchSuggestions } from "@/lib/hooks/use-search-suggestions";
import { apiRequest } from "@/services/api-request";
import type { CompetitorListResult, TeamListResult } from "@/types/competitor";

const DEBOUNCE_MS = 300;
const SUGGESTION_LIMIT = 5;

type SuggestKind = "fencers" | "clubs";

export interface SearchSuggestSource {
  kind: SuggestKind;
  href: string;
}

interface SuggestionSectionData {
  source: SearchSuggestSource;
  names: string[];
}

export interface SearchFormProps {
  action: string;
  label: string;
  placeholder: string;
  defaultValue?: string;
  suggest?: { tournamentId: string; sources: SearchSuggestSource[] };
}

const SECTION_HEADINGS: Record<SuggestKind, { title: string; icon: React.ReactNode }> = {
  fencers: { title: "Fencers", icon: <PersonOutlined aria-hidden /> },
  clubs: { title: "Clubs", icon: <GroupsOutlined aria-hidden /> },
};

async function loadNames(kind: SuggestKind, tournamentId: string, term: string) {
  const query = new URLSearchParams({ limit: String(SUGGESTION_LIMIT), q: term });
  if (kind === "clubs") {
    const result = await apiRequest<TeamListResult>(
      `/tournaments/${encodeURIComponent(tournamentId)}/teams?${query}`,
    );
    return result.data.map(({ name }) => name);
  }
  query.set("tournament_id", tournamentId);
  const result = await apiRequest<CompetitorListResult>(`/competitors?${query}`);
  return result.data.map(({ firstName, lastName }) => `${firstName} ${lastName}`);
}

// A real GET form, so it still filters before hydration and without
// JavaScript. Once hydrated, typing navigates on a debounce.
function SearchForm({
  action,
  label,
  placeholder,
  defaultValue = "",
  suggest,
}: SearchFormProps) {
  const router = useRouter();
  const { searchParams, setFilters, isPending } = useTournamentFilters();
  const [value, setValue] = useState(defaultValue);
  const [syncedDefaultValue, setSyncedDefaultValue] = useState(defaultValue);
  const [sentSearch, setSentSearch] = useState(defaultValue);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const suggestions = useSearchSuggestions<SuggestionSectionData>((term) =>
    Promise.all(
      (suggest?.sources ?? []).map(async (source) => ({
        source,
        names: await loadNames(source.kind, suggest?.tournamentId ?? "", term),
      })),
    ),
  );

  // Follows the URL when its query changes from elsewhere (e.g. navigating
  // back), but not when it is only catching up to a search this field sent,
  // or it would overwrite whatever was typed since. Adjusted during render,
  // not an effect, so it lands before the stale value paints.
  if (defaultValue !== syncedDefaultValue) {
    setSyncedDefaultValue(defaultValue);
    if (defaultValue !== sentSearch) {
      setValue(defaultValue);
    }
  }

  const navigate = (search: string) => {
    setSentSearch(search);
    setFilters({ q: search });
  };
  const [debouncedNavigate, cancelDebouncedNavigate] = useDebouncedCallback(
    navigate,
    DEBOUNCE_MS,
  );

  const clear = () => {
    setValue("");
    cancelDebouncedNavigate();
    navigate("");
    suggestions.clear();
    setSuggestionsOpen(false);
  };

  const pick = (source: SearchSuggestSource, name: string) => {
    cancelDebouncedNavigate();
    setSuggestionsOpen(false);
    router.push(`${source.href}?q=${encodeURIComponent(name)}`);
  };

  return (
    <form
      action={action}
      className="relative flex-1"
      aria-busy={isPending}
      onSubmit={(event) => {
        event.preventDefault();
        cancelDebouncedNavigate();
        navigate(value.trim());
      }}
    >
      {/* Submitting a GET form replaces the whole query string with its own
          fields, so the other current params (e.g. date) ride along as hidden
          inputs. This is the path taken before JS hydrates. */}
      {Array.from(searchParams)
        .filter(([key]) => key !== "q" && key !== "offset")
        .map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
      <SearchBar
        aria-label={label}
        name="q"
        type="search"
        placeholder={placeholder}
        value={value}
        expanded={Boolean(suggest) && suggestionsOpen && value.trim() !== ""}
        onChange={(event) => {
          setValue(event.target.value);
          debouncedNavigate(event.target.value.trim());
          if (suggest) {
            suggestions.change(event.target.value);
            setSuggestionsOpen(true);
          }
        }}
        onFocus={() => setSuggestionsOpen(true)}
        onBlur={() => setSuggestionsOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setSuggestionsOpen(false);
          }
        }}
        icon={
          value ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={clear}
              className="cursor-pointer rounded-full text-neutral-secondary outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CancelOutlined aria-hidden className="size-4" />
            </button>
          ) : (
            <SearchOutlined
              aria-hidden
              data-pending={isPending || undefined}
              className="size-4 text-neutral-secondary transition-opacity data-pending:opacity-40"
            />
          )
        }
      >
        <SuggestionDropdown
          sections={suggestions.suggestions}
          failed={suggestions.failed}
          loading={suggestions.loading}
          onPick={pick}
        />
      </SearchBar>
    </form>
  );
}

interface SuggestionDropdownProps {
  sections: SuggestionSectionData[] | null;
  failed: boolean;
  loading: boolean;
  onPick: (source: SearchSuggestSource, name: string) => void;
}

function SuggestionDropdown({ sections, failed, loading, onPick }: SuggestionDropdownProps) {
  const filled = sections?.filter(({ names }) => names.length > 0) ?? [];
  let message: string | null = null;
  if (failed) {
    message = "Couldn’t load suggestions.";
  } else if (loading || sections === null) {
    message = "Searching…";
  } else if (filled.length === 0) {
    message = "No matches.";
  }

  return (
    <Dropdown>
      {message ? (
        <DropdownMessage>{message}</DropdownMessage>
      ) : (
        filled.map((section) => (
          <SuggestionSection key={section.source.kind} section={section} onPick={onPick} />
        ))
      )}
    </Dropdown>
  );
}

interface SuggestionSectionProps {
  section: SuggestionSectionData;
  onPick: (source: SearchSuggestSource, name: string) => void;
}

function SuggestionSection({ section, onPick }: SuggestionSectionProps) {
  const { title, icon } = SECTION_HEADINGS[section.source.kind];

  return (
    <DropdownSection title={title} icon={icon}>
      {section.names.map((name) => (
        <DropdownOption key={name} onClick={() => onPick(section.source, name)}>
          {name}
        </DropdownOption>
      ))}
    </DropdownSection>
  );
}

export { SearchForm };
