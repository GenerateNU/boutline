import { useCallback, useEffect, useRef, useState } from "react";

import type { Bout } from "@/types/bout";
import type { Scoring } from "@/types/scoring";
import { errorMessage } from "@/utils/error-message";

import { getBoard, listScoring } from "../_services/scoring-api";
import type { Board } from "../_types/board";
import { byRecordedOrder } from "../tally-helper";

export function useBoard(boutId: string, refreshHistory: () => Promise<void>) {
  const [board, setBoard] = useState<Board | null>(null);
  const [scores, setScores] = useState<Scoring[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Queued tasks need the latest list synchronously and render needs state; the
  // React Compiler lint forbids reading refs during render, so both are kept.
  const confirmed = useRef<Scoring[]>([]);

  const commit = useCallback((next: Scoring[]) => {
    confirmed.current = next;
    setScores(next);
  }, []);

  const setBout = useCallback((bout: Bout) => {
    setBoard((current) => current && { ...current, bout });
  }, []);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const [loadedBoard, loadedScores] = await Promise.all([
          getBoard(boutId),
          listScoring(boutId),
          refreshHistory(),
        ]);
        if (ignore) {
          return;
        }
        setBoard(loadedBoard);
        commit(byRecordedOrder(loadedScores));
      } catch (caught) {
        if (!ignore) {
          setLoadError(errorMessage(caught));
        }
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [boutId, commit, refreshHistory]);

  return { board, scores, confirmed, commit, setBout, loadError };
}
