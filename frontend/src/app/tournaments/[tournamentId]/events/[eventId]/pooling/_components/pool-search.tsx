"use client";

import GroupOutlined from "@mui/icons-material/GroupOutlined";
import PersonOutlined from "@mui/icons-material/PersonOutlined";
import { useRef } from "react";

import { Dropdown, DropdownOption, DropdownSection } from "@/components/primitives/dropdown";
import { SearchBar } from "@/components/primitives/search-bar";

import { poolSearchSuggestions } from "../_services/pool-search-suggestions";
import type { PoolFilterOptions } from "../_types/pool-filters";

interface PoolSearchProps {
  value: string;
  onChange: (value: string) => void;
  options: PoolFilterOptions;
}

export function PoolSearch({ value, onChange, options }: PoolSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { fencers, clubs } = poolSearchSuggestions(options, value);
  const groups = [
    { title: "Fencers", icon: <PersonOutlined aria-hidden />, suggestions: fencers },
    { title: "Clubs", icon: <GroupOutlined aria-hidden />, suggestions: clubs },
  ].filter(({ suggestions }) => suggestions.length > 0);

  function pick(suggestion: string) {
    onChange(suggestion);
    // Blurring closes the SearchBar's results, so the picked pools show without the list over them.
    inputRef.current?.blur();
  }

  return (
    <SearchBar
      ref={inputRef}
      type="search"
      aria-label="Search fencers or clubs"
      placeholder="Search fencers or clubs"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="flex-1"
    >
      {groups.length > 0 && (
        <Dropdown>
          {groups.map(({ title, icon, suggestions }) => (
            <DropdownSection key={title} title={title} icon={icon}>
              {suggestions.map((suggestion) => (
                <DropdownOption key={suggestion.value} onClick={() => pick(suggestion.value)}>
                  {suggestion.label}
                </DropdownOption>
              ))}
            </DropdownSection>
          ))}
        </Dropdown>
      )}
    </SearchBar>
  );
}
