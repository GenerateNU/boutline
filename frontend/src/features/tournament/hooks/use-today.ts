"use client";

import { useSyncExternalStore } from "react";

import { formatDateParam, parseDateParam } from "@/features/tournament/lib/date-param";

const subscribe = () => () => {};

function useToday(): Date | undefined {
  const today = useSyncExternalStore(
    subscribe,
    () => formatDateParam(new Date()),
    () => undefined,
  );
  return parseDateParam(today);
}

export { useToday };
