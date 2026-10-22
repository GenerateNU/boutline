"use client";

// TEMPORARY: scaffolding to prove the pinning plumbing works end to end.
// No design for this page exists yet (see docs/design.md) — replace with the
// real pin UI once one does, rather than extending this page in place.

import { useEffect, useState } from "react";
import { usePinnedItems } from "@/features/pinning/hooks/use-pinned-items";
import { fetchPinnedItems } from "@/features/pinning/services/pinned-items-query";
import { fetchAvailableItems } from "@/features/pinning/services/available-items-query";
import { Select } from "@/components/primitives/select";
import { Competitor } from "@/types/competitor";
import { Bout } from "@/types/bout";

export default function PinnedPage() {
  const { pinned, pinFencer, unpinFencer, pinMatch, unpinMatch } = usePinnedItems();
  const [availableFencers, setAvailableFencers] = useState<Competitor[]>([]);
  const [availableMatches, setAvailableMatches] = useState<Bout[]>([]);
  const [selectedFencerId, setSelectedFencerId] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [fencers, setFencers] = useState<Competitor[]>([]);
  const [matches, setMatches] = useState<Bout[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailableItems()
      .then((items) => {
        setAvailableFencers(items.fencers);
        setAvailableMatches(items.matches);
        setSelectedFencerId(items.fencers[0]?.id ?? "");
        setSelectedMatchId(items.matches[0]?.id ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load fencers/matches"));
  }, []);

  async function handleLoad() {
    setError(null);
    try {
      const items = await fetchPinnedItems(pinned);
      setFencers(items.fencers);
      setMatches(items.matches);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pinned items");
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1>Pinned items (dummy page)</h1>

      <section className="flex flex-col gap-2">
        <h2>Fencers</h2>
        <div className="flex gap-2">
          <Select
            className="max-w-xs"
            value={selectedFencerId}
            onChange={(e) => setSelectedFencerId(e.target.value)}
          >
            {availableFencers.map((fencer) => (
              <option key={fencer.id} value={fencer.id}>
                {fencer.firstName} {fencer.lastName} ({fencer.team})
              </option>
            ))}
          </Select>
          <button className="border p-1" onClick={() => pinFencer(selectedFencerId)}>
            Pin
          </button>
          <button className="border p-1" onClick={() => unpinFencer(selectedFencerId)}>
            Unpin
          </button>
        </div>
        <p>Pinned fencer ids: {pinned.fencerIds.join(", ") || "none"}</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2>Matches</h2>
        <div className="flex gap-2">
          <Select
            className="max-w-xs"
            value={selectedMatchId}
            onChange={(e) => setSelectedMatchId(e.target.value)}
          >
            {availableMatches.map((match) => (
              <option key={match.id} value={match.id}>
                {match.competitor_1_id} vs {match.competitor_2_id} ({match.status})
              </option>
            ))}
          </Select>
          <button className="border p-1" onClick={() => pinMatch(selectedMatchId)}>
            Pin
          </button>
          <button className="border p-1" onClick={() => unpinMatch(selectedMatchId)}>
            Unpin
          </button>
        </div>
        <p>Pinned match ids: {pinned.matchIds.join(", ") || "none"}</p>
      </section>

      <button className="border p-1" onClick={handleLoad}>
        Load pinned items
      </button>
      {error && <p>{error}</p>}

      <section>
        <h2>Fencers data</h2>
        <ul>
          {fencers.map((fencer) => (
            <li key={fencer.id}>
              {fencer.firstName} {fencer.lastName} ({fencer.team})
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Matches data</h2>
        <ul>
          {matches.map((match) => (
            <li key={match.id}>
              {match.id}: {match.competitor_1_id} vs {match.competitor_2_id} ({match.status})
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
