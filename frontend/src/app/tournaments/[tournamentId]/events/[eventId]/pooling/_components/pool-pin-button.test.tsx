import { fireEvent, render, screen } from "@testing-library/react";

import { PINNED_STORAGE_KEY } from "@/features/pinning/types/pinning";

import { buildPool } from "../_fixtures/build-pool";

import { PoolPinButton } from "./pool-pin-button";

const pool = buildPool({ number: 1, strip: "Strip 3", fencers: [] });

function stored() {
  return JSON.parse(window.sessionStorage.getItem(PINNED_STORAGE_KEY) ?? "{}");
}

describe("PoolPinButton", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("pins and unpins the pool", () => {
    render(<PoolPinButton pool={pool} />);

    fireEvent.click(screen.getByRole("button", { name: "Pin Pool 1 · Strip 3" }));

    expect(screen.getByRole("button", { name: "Unpin Pool 1 · Strip 3" })).toHaveAttribute("aria-pressed", "true");
    expect(stored().poolIds).toEqual(["pool-1"]);

    fireEvent.click(screen.getByRole("button", { name: "Unpin Pool 1 · Strip 3" }));

    expect(screen.getByRole("button", { name: "Pin Pool 1 · Strip 3" })).toHaveAttribute("aria-pressed", "false");
    expect(stored().poolIds).toEqual([]);
  });

  it("keeps fencer and bout pins saved before pools could be pinned", () => {
    window.sessionStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify({ fencerIds: ["f1"], boutIds: ["b1"] }));
    render(<PoolPinButton pool={pool} />);

    fireEvent.click(screen.getByRole("button", { name: "Pin Pool 1 · Strip 3" }));

    expect(stored()).toEqual({ fencerIds: ["f1"], boutIds: ["b1"], poolIds: ["pool-1"] });
  });
});
