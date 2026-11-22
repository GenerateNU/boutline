"use client";

import GroupOutlined from "@mui/icons-material/GroupOutlined";
import PersonOutlined from "@mui/icons-material/PersonOutlined";
import { useRef, useState } from "react";

import { Dropdown, DropdownOption, DropdownSection } from "@/components/primitives/dropdown";
import { SearchBar } from "@/components/primitives/search-bar";

import { poolSearchSuggestions } from "../_services/pool-search-suggestions";
import type { PoolFilterOptions } from "../_types/pool-filters";

interface PoolSearchProps {
  value: string;
  onChange: (value: string) => void;
  options: PoolFilterOptions;
  disabled?: boolean;
}

export function PoolSearch({ value, onChange, options, disabled }: PoolSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dismissed, setDismissed] = useState(false);
  const { fencers, clubs } = poolSearchSuggestions(options, value);
  const groups = [
    { title: "Fencers", icon: <PersonOutlined aria-hidden />, suggestions: fencers },
    { title: "Clubs", icon: <GroupOutlined aria-hidden />, suggestions: clubs },
  ].filter(({ suggestions }) => suggestions.length > 0);

  function pick(suggestion: string) {
    onChange(suggestion);
    // A pointer pick leaves focus in the input (the results swallow mousedown), so blurring
    // closes the list and drops the phone keyboard. A keyboard pick has focus on the option,
    // so focus goes back to the input with the list held shut until the next keystroke.
    if (document.activeElement === inputRef.current) {
      inputRef.current?.blur();
      return;
    }
    setDismissed(true);
    inputRef.current?.focus();
  }

  return (
    <SearchBar
      ref={inputRef}
      type="search"
      aria-label="Search fencers or clubs"
      placeholder="Search fencers or clubs"
      value={value}
      disabled={disabled}
      expanded={dismissed ? false : undefined}
      onChange={(event) => {
        setDismissed(false);
        onChange(event.target.value);
      }}
      onBlur={() => setDismissed(false)}
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
