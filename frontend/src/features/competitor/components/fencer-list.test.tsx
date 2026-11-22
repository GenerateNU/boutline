import { fireEvent, render, screen } from "@testing-library/react";

import { FencerList } from "@/features/competitor/components/fencer-list";
import type { Competitor } from "@/types/competitor";

function fencer(id: string, firstName: string, lastName: string): Competitor {
  return { id, eventId: "e1", tournamentId: "t1", firstName, lastName, rating: "A", ratingYear: 26, team: "" };
}

const COMPETITORS = [fencer("c1", "Yan", "Wang"), fencer("c2", "Caitlin", "Lee"), fencer("c3", "Ann", "Kim")];

function names() {
  return screen.getAllByRole("listitem").map((item) => item.querySelector("[data-slot=card-title]")?.textContent);
}

describe("FencerList", () => {
  beforeEach(() => sessionStorage.clear());

  it.each([
    { case: "nothing pinned", pin: [], order: ["Yan Wang", "Caitlin Lee", "Ann Kim"] },
    { case: "one pinned", pin: ["Caitlin Lee"], order: ["Caitlin Lee", "Yan Wang", "Ann Kim"] },
    { case: "two pinned, alphabetically", pin: ["Yan Wang", "Ann Kim"], order: ["Ann Kim", "Yan Wang", "Caitlin Lee"] },
  ])("puts pinned fencers first: $case", ({ pin, order }) => {
    render(<FencerList competitors={COMPETITORS} />);

    for (const name of pin) {
      fireEvent.click(screen.getByRole("button", { name: `Pin ${name}` }));
    }

    expect(names()).toEqual(order);
  });
});
