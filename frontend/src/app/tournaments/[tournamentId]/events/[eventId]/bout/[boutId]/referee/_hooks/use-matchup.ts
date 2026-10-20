import { useCallback, useEffect, useRef, useState } from "react";

import { Bout } from "@/types/bout";
import { Scoring } from "@/types/scoring";
import { errorMessage } from "@/utils/error-message";

import { getMatchup, listScoring } from "../_services/scoring-api";
import { Matchup } from "../_types/matchup";
import { byRecordedOrder } from "../tally-helper";

export function useMatchup(boutId: string, refreshHistory: () => Promise<void>) {
  const [matchup, setMatchup] = useState<Matchup | null>(null);
  const [scores, setScores] = useState<Scoring[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Queued tasks need the latest list synchronously and render needs state; the
  // React Compiler lint forbids reading refs during render, so both are kept.
  const confirmed = useRef<Scoring[]>([]);

  const setConfirmed = useCallback((next: Scoring[]) => {
    confirmed.current = next;
    setScores(next);
  }, []);

  const setBout = useCallback((bout: Bout) => {
    setMatchup((current) => current && { ...current, bout });
  }, []);

  useEffect(() => {
    let ignore = false;

    // Best-effort: the scoreboard works without its history, so a failure here
    // must not block it or count as a load error.
    async function loadHistory() {
      try {
        await refreshHistory();
      } catch {
        // The history refreshes again after the next touch.
      }
    }

    async function load() {
      try {
        const [loadedMatchup, loadedScores] = await Promise.all([getMatchup(boutId), listScoring(boutId)]);
        if (ignore) {
          return;
        }
        setMatchup(loadedMatchup);
        setConfirmed(byRecordedOrder(loadedScores));
      } catch (caught) {
        if (!ignore) {
          setLoadError(errorMessage(caught));
        }
      }
    }

    loadHistory();
    load();
    return () => {
      ignore = true;
    };
  }, [boutId, setConfirmed, refreshHistory]);

  return { matchup, scores, confirmed, setConfirmed, setBout, loadError };
}
