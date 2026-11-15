"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useTransition } from "react";

import { formatDateParam } from "@/features/tournament/lib/date-param";

function useTournamentFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const committed = searchParams.toString();
  const pending = useRef<{ from: string; params: URLSearchParams } | null>(null);

  function setFilters(changes: Record<string, string | undefined>) {
    const base = pending.current?.from === committed ? pending.current.params : searchParams;
    const params = new URLSearchParams(base);
    params.delete("offset");
    for (const [key, value] of Object.entries(changes)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    pending.current = { from: committed, params };

    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  }

  function setDate(day: Date) {
    setFilters({
      date: formatDateParam(day),
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }

  function clearDate() {
    setFilters({ date: undefined, tz: undefined });
  }

  return { searchParams, setFilters, setDate, clearDate, isPending };
}

export { useTournamentFilters };
