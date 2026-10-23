import { fireEvent, render, screen } from "@testing-library/react";

import { PinPoolButton } from "./pin-pool-button";

function pinButton() {
  return screen.getByRole("button", { name: "Pin pool" });
}

describe("PinPoolButton", () => {
  beforeEach(() => localStorage.clear());

  it.each([
    { poolId: "pool-1", pressed: "true" },
    { poolId: "pool-2", pressed: "false" },
  ])("starts $poolId with aria-pressed $pressed", ({ poolId, pressed }) => {
    render(<PinPoolButton eventId="e" poolId={poolId} />);

    expect(pinButton()).toHaveAttribute("aria-pressed", pressed);
  });

  it("pins on click and stays pinned after remounting", () => {
    const { unmount } = render(<PinPoolButton eventId="e" poolId="pool-2" />);

    fireEvent.click(pinButton());
    expect(pinButton()).toHaveAttribute("aria-pressed", "true");

    unmount();
    render(<PinPoolButton eventId="e" poolId="pool-2" />);
    expect(pinButton()).toHaveAttribute("aria-pressed", "true");
  });
});
