"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";

import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";

const debounceMs = 300;

type SearchFormProps = {
  action: string;
  placeholder: string;
  defaultValue?: string;
};

// A real GET form, so it still filters before hydration and without
// JavaScript. Once hydrated, typing navigates on a debounce.
//
// TODO(#107): swap the markup below for the SearchBar primitive from
// vindema/lofi-components-4. Keep the debounce and router.replace — SearchBar
// is a <div role="search">, not a form, so it must stay wrapped in this
// <form> or the no-JS fallback is lost. Its default leading icon is a
// hamburger and its search icon sits on the right, so the lofi needs a look.
function SearchForm({
  action,
  placeholder,
  defaultValue = "",
}: SearchFormProps) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [isPending, startTransition] = useTransition();

  function navigate(search: string) {
    clearTimeout(timer.current);
    const query = search ? `?q=${encodeURIComponent(search)}` : "";
    // replace, not push: typing should not fill the history stack. Leaving
    // offset off puts a new search back on the first page.
    startTransition(() => {
      router.replace(`${action}${query}`, { scroll: false });
    });
  }

  return (
    <div className="flex items-center gap-2">
      <form
        action={action}
        role="search"
        className="relative flex-1"
        aria-busy={isPending}
        onSubmit={(event) => {
          event.preventDefault();
          navigate(
            new FormData(event.currentTarget).get("q")?.toString().trim() ?? "",
          );
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
          defaultValue={defaultValue}
          onChange={(event) => {
            const search = event.target.value.trim();
            clearTimeout(timer.current);
            timer.current = setTimeout(() => navigate(search), debounceMs);
          }}
          className="pl-9"
        />
      </form>

      {/* Inert on purpose: the filter popover is a follow-up ticket. type is
          "button" so it cannot submit the search form. PR #107 adds the Modal
          and Menu primitives this will be built from. */}
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
