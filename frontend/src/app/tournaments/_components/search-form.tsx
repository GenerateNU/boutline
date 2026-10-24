"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";

const debounceMs = 300;

type SearchFormProps = {
  action: string;
  placeholder: string;
  defaultValue?: string;
  params?: Record<string, string>;
};

// A real GET form, so it still filters before hydration and without
// JavaScript. Once hydrated, typing navigates on a debounce.
function SearchForm({
  action,
  placeholder,
  defaultValue = "",
  params,
}: SearchFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function navigate(search: string) {
    const query = new URLSearchParams(params);
    if (search) {
      query.set("q", search);
    }
    // replace, not push: typing should not fill the history stack. Leaving
    // offset off puts a new search back on the first page.
    startTransition(() => {
      router.replace(`${action}${query.size ? `?${query}` : ""}`, {
        scroll: false,
      });
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
          navigate(
            new FormData(event.currentTarget).get("q")?.toString().trim() ?? "",
          );
        }}
      >
        {Object.entries(params ?? {}).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
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
          onChange={(event) => debouncedNavigate(event.target.value.trim())}
          className="pl-9"
        />
      </form>

      {/* Inert on purpose: the filter popover is a follow-up ticket. type is
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
