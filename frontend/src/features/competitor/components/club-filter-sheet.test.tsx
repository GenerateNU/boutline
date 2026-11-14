import { act, fireEvent, render, screen } from "@testing-library/react";

import { ClubFilterSheet } from "@/features/competitor/components/club-filter-sheet";

async function openSheet() {
  render(<ClubFilterSheet />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Filter clubs" }));
  });
}

describe("ClubFilterSheet", () => {
  it("lists Fencer, Club and Weapon as disabled placeholders", async () => {
    await openSheet();

    const boxes = screen.getAllByRole("searchbox");
    expect(boxes.map((box) => box.getAttribute("aria-label"))).toEqual(["Fencer", "Club"]);
    boxes.forEach((box) => expect(box).toBeDisabled());
    const weapons = screen.getAllByRole("radio");
    expect(weapons.map((radio) => radio.textContent)).toEqual(["Foil", "Sabre", "Epee"]);
    weapons.forEach((radio) => expect(radio).toBeDisabled());
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });

  it.each([
    { button: "Show Clubs", stillOpen: false },
    { button: "Clear All", stillOpen: true },
  ])("$button leaves the sheet open: $stillOpen", async ({ button, stillOpen }) => {
    await openSheet();

    fireEvent.click(screen.getByRole("button", { name: button }));

    expect(Boolean(screen.queryByRole("dialog"))).toBe(stillOpen);
  });
});
