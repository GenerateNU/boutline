import { useCallback, useRef, useState } from "react";

import type { ScoringHistoryEntry } from "@/types/scoring";

import { getScoringHistory } from "../_services/scoring-api";

export function useScoreHistory(boutId: string) {
  const [history, setHistory] = useState<ScoringHistoryEntry[]>([]);
  // Responses can resolve out of order (StrictMode double effects, a changed bout),
  // so only the most recently requested one may be applied.
  const latest = useRef(0);

  const refreshHistory = useCallback(async () => {
    const ticket = ++latest.current;
    const entries = await getScoringHistory(boutId);
    if (ticket === latest.current) {
      setHistory(entries);
    }
  }, [boutId]);

  return { history, refreshHistory };
}
