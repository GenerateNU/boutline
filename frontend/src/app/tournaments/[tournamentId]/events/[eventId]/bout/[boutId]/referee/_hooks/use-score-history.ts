import { useCallback, useRef, useState } from "react";

import { ScoringHistoryEntry } from "@/types/scoring";

import { getScoringHistory } from "../_services/scoring-api";

export function useScoreHistory(boutId: string) {
  const [history, setHistory] = useState<ScoringHistoryEntry[]>([]);
  // Whether the latest fetch failed, so the panel doesn't claim an empty or current history.
  const [historyFailed, setHistoryFailed] = useState(false);
  // Responses can resolve out of order (StrictMode double effects, a changed bout),
  // so only the most recently requested one may be applied.
  const latest = useRef(0);

  const refreshHistory = useCallback(async () => {
    const ticket = ++latest.current;
    try {
      const entries = await getScoringHistory(boutId);
      if (ticket === latest.current) {
        setHistory(entries);
        setHistoryFailed(false);
      }
    } catch (caught) {
      if (ticket === latest.current) {
        setHistoryFailed(true);
      }
      throw caught;
    }
  }, [boutId]);

  return { history, historyFailed, refreshHistory };
}
