"use client";

import { useSyncExternalStore } from "react";

import { formatDateParam, parseDateParam } from "@/features/tournament/lib/date-param";

const subscribe = () => () => {};

// Undefined on the server and during hydration, then the browser's local day,
// so server and browser never render different dates. A string snapshot stays
// referentially stable between renders.
function useToday(): Date | undefined {
  const today = useSyncExternalStore(
    subscribe,
    () => formatDateParam(new Date()),
    () => undefined,
  );
  return parseDateParam(today);
}

export { useToday };
