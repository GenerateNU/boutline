"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";

const debounceMs = 300;

type SearchFormProps = {
  action: string;
  placeholder: string;
  defaultValue?: string;
};

// A real GET form, so it still filters before hydration and without
// JavaScript. Once hydrated, typing navigates on a debounce.
function SearchForm({
  action,
  placeholder,
  defaultValue = "",
}: SearchFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(defaultValue);
  const [syncedDefaultValue, setSyncedDefaultValue] = useState(defaultValue);

  // Keeps the field in sync when the URL's query changes from elsewhere
  // (e.g. navigating back), without resetting it on every keystroke. Adjusted
  // during render, not an effect, so it lands before the stale value paints.
  if (defaultValue !== syncedDefaultValue) {
    setSyncedDefaultValue(defaultValue);
    setValue(defaultValue);
  }

  function navigate(search: string) {
    const query = search ? `?q=${encodeURIComponent(search)}` : "";
    // replace, not push: typing should not fill the history stack. Leaving
    // offset off puts a new search back on the first page.
    startTransition(() => {
      router.replace(`${action}${query}`, { scroll: false });
    });
  }

  const [debouncedNavigate, cancelDebouncedNavigate] = useDebouncedCallback(
    navigate,
    debounceMs,
  );

  return (
    <div className="flex items-center gap-2">
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
        <Search
          aria-hidden
          data-pending={isPending || undefined}
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground transition-opacity data-pending:opacity-40"
        />
        <Input
          aria-label={placeholder}
          name="q"
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            debouncedNavigate(event.target.value.trim());
          }}
          className="pl-9"
        />
      </form>

      {/* Inert on purpose: date filtering is a follow-up ticket. type is
          "button" so it cannot submit the search form. */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Filter (not available yet)"
        className="shrink-0 rounded-md"
      >
        <SlidersHorizontal aria-hidden />
      </Button>
    </div>
  );
}

export { SearchForm };
