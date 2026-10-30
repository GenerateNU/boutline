"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { formatDateParam } from "@/features/tournament/lib/date-param";

function useTournamentFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setFilters(changes: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams);
    params.delete("offset");
    for (const [key, value] of Object.entries(changes)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  }

  function setDate(day: Date | undefined) {
    setFilters({
      date: day ? formatDateParam(day) : undefined,
      tz: day ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined,
    });
  }

  return { searchParams, setFilters, setDate, isPending };
}

export { useTournamentFilters };
