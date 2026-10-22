"use client";

import Image from "next/image";
import { useState } from "react";

import { Input } from "@/components/primitives/input";
import { useTournamentFilters } from "@/features/tournament/hooks/use-tournament-filters";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";

const debounceMs = 300;

type SearchFormProps = {
  action: string;
  label: string;
  defaultValue?: string;
};

// A real GET form, so it still filters before hydration and without
// JavaScript. Once hydrated, typing navigates on a debounce.
function SearchForm({
  action,
  label,
  defaultValue = "",
}: SearchFormProps) {
  const { searchParams, setFilters, isPending } = useTournamentFilters();
  const [value, setValue] = useState(defaultValue);
  const [syncedDefaultValue, setSyncedDefaultValue] = useState(defaultValue);

  // Keeps the field in sync when the URL's query changes from elsewhere
  // (e.g. navigating back), without resetting it on every keystroke. Adjusted
  // during render, not an effect, so it lands before the stale value paints.
  if (defaultValue !== syncedDefaultValue) {
    setSyncedDefaultValue(defaultValue);
    setValue(defaultValue);
  }

  const navigate = (search: string) => setFilters({ q: search });
  const [debouncedNavigate, cancelDebouncedNavigate] = useDebouncedCallback(
    navigate,
    debounceMs,
  );

  return (
    <form
      action={action}
      role="search"
      className="relative flex-1"
      aria-busy={isPending}
      onSubmit={(event) => {
        event.preventDefault();
        cancelDebouncedNavigate();
        navigate(value.trim());
      }}
    >
      {/* Carries the other active filters through a plain submit, so searching
          before hydration doesn't drop them. offset is left off on purpose. */}
      {Array.from(searchParams)
        .filter(([key]) => key !== "q" && key !== "offset")
        .map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
      <Input
        aria-label={label}
        name="q"
        type="search"
        placeholder="Enter search text"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          debouncedNavigate(event.target.value.trim());
        }}
        className="h-12 rounded-md border-brand pr-12 pl-4 text-brand placeholder:text-brand"
      />
      <Image
        src="/search.svg"
        alt=""
        width={24}
        height={24}
        data-pending={isPending || undefined}
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 transition-opacity data-pending:opacity-40"
      />
    </form>
  );
}

export { SearchForm };
