import { fireEvent, render, screen } from "@testing-library/react";

import { PINNED_STORAGE_KEY } from "@/features/pinning/types/pinning";

import { buildPool } from "@/features/pool/fixtures/build-pool";

import { PoolPinButton } from "./pool-pin-button";

const POOL = buildPool({ number: 1, strip: "Strip 3", fencers: [] });
const EVENT = { tournamentId: "t1", eventId: "e1" };
const PINNED_POOL = { ...EVENT, id: "pool-1" };

function stored() {
  return JSON.parse(window.sessionStorage.getItem(PINNED_STORAGE_KEY) ?? "{}");
}

describe("PoolPinButton", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("pins and unpins the pool", () => {
    render(<PoolPinButton pool={POOL} event={EVENT} />);

    fireEvent.click(screen.getByRole("button", { name: "Pin Pool 1 \u00b7 Strip 3" }));

    expect(screen.getByRole("button", { name: "Unpin Pool 1 \u00b7 Strip 3" })).toHaveAttribute("aria-pressed", "true");
    expect(stored().pools).toEqual([PINNED_POOL]);

    fireEvent.click(screen.getByRole("button", { name: "Unpin Pool 1 \u00b7 Strip 3" }));

    expect(screen.getByRole("button", { name: "Pin Pool 1 \u00b7 Strip 3" })).toHaveAttribute("aria-pressed", "false");
    expect(stored().pools).toEqual([]);
  });

  it("keeps fencer and bout pins saved in the legacy shape", () => {
    window.sessionStorage.setItem(
      PINNED_STORAGE_KEY,
      JSON.stringify({ fencerIds: ["f1"], boutIds: ["b1"], poolIds: ["old"] }),
    );
    render(<PoolPinButton pool={POOL} event={EVENT} />);

    fireEvent.click(screen.getByRole("button", { name: "Pin Pool 1 \u00b7 Strip 3" }));

    expect(stored()).toEqual({ fencerIds: ["f1"], boutIds: ["b1"], clubs: [], pools: [PINNED_POOL], tableaus: [] });
  });
});
