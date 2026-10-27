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
  const { pinned, pinFencer, unpinFencer, pinBout, unpinBout } = usePinnedItems();
  const [availableFencers, setAvailableFencers] = useState<Competitor[]>([]);
  const [availableBouts, setAvailableBouts] = useState<Bout[]>([]);
  const [selectedFencerId, setSelectedFencerId] = useState("");
  const [selectedBoutId, setSelectedBoutId] = useState("");
  const [fencers, setFencers] = useState<Competitor[]>([]);
  const [bouts, setBouts] = useState<Bout[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailableItems()
      .then((items) => {
        setAvailableFencers(items.fencers);
        setAvailableBouts(items.bouts);
        setSelectedFencerId(items.fencers[0]?.id ?? "");
        setSelectedBoutId(items.bouts[0]?.id ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load fencers/bouts"));
  }, []);

  async function handleLoad() {
    setError(null);
    try {
      const items = await fetchPinnedItems(pinned);
      setFencers(items.fencers);
      setBouts(items.bouts);
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
          <button
            className="border p-1"
            disabled={!selectedFencerId}
            onClick={() => pinFencer(selectedFencerId)}
          >
            Pin
          </button>
          <button className="border p-1" onClick={() => unpinFencer(selectedFencerId)}>
            Unpin
          </button>
        </div>
        <p>Pinned fencer ids: {pinned.fencerIds.join(", ") || "none"}</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2>Bouts</h2>
        <div className="flex gap-2">
          <Select
            className="max-w-xs"
            value={selectedBoutId}
            onChange={(e) => setSelectedBoutId(e.target.value)}
          >
            {availableBouts.map((bout) => (
              <option key={bout.id} value={bout.id}>
                {bout.competitor_1_id} vs {bout.competitor_2_id} ({bout.status})
              </option>
            ))}
          </Select>
          <button
            className="border p-1"
            disabled={!selectedBoutId}
            onClick={() => pinBout(selectedBoutId)}
          >
            Pin
          </button>
          <button className="border p-1" onClick={() => unpinBout(selectedBoutId)}>
            Unpin
          </button>
        </div>
        <p>Pinned bout ids: {pinned.boutIds.join(", ") || "none"}</p>
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
        <h2>Bouts data</h2>
        <ul>
          {bouts.map((bout) => (
            <li key={bout.id}>
              {bout.id}: {bout.competitor_1_id} vs {bout.competitor_2_id} ({bout.status})
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
