import { fireEvent, render, screen } from "@testing-library/react";

import { ClubList } from "@/features/competitor/components/club-list";

const NAMES = ["Nfc", "Boston Blade Club", "Alliance"];

function names() {
  return screen.getAllByRole("listitem").map((item) => item.querySelector("[data-slot=card-title]")?.textContent);
}

describe("ClubList", () => {
  beforeEach(() => sessionStorage.clear());

  it.each([
    { case: "nothing pinned", pin: [], order: ["Nfc", "Boston Blade Club", "Alliance"] },
    { case: "two pinned, alphabetically", pin: ["Nfc", "Boston Blade Club"], order: ["Boston Blade Club", "Nfc", "Alliance"] },
  ])("puts pinned clubs first: $case", ({ pin, order }) => {
    render(<ClubList names={NAMES} tournamentId="t1" />);

    for (const name of pin) {
      fireEvent.click(screen.getByRole("button", { name: `Pin ${name}` }));
    }

    expect(names()).toEqual(order);
  });
});
