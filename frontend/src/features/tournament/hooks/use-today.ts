"use client";

import { useMemo, useSyncExternalStore } from "react";

import { formatDateParam, parseDateParam } from "@/features/tournament/lib/date-param";

const subscribe = () => () => {};

function useToday(): Date | undefined {
  const today = useSyncExternalStore(
    subscribe,
    () => formatDateParam(new Date()),
    () => undefined,
  );
  // Same Date until the day changes, so effects can depend on it.
  return useMemo(() => parseDateParam(today), [today]);
}

export { useToday };
