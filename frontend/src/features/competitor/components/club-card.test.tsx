import { fireEvent, render, screen } from "@testing-library/react";

import { ClubCard } from "@/features/competitor/components/club-card";
import { PINNED_STORAGE_KEY } from "@/features/pinning/types/pinning";

const CLUB = { tournamentId: "t1", name: "Generate & Co" };

function storedClubs() {
  const raw = sessionStorage.getItem(PINNED_STORAGE_KEY);
  return raw ? JSON.parse(raw).clubs : [];
}

describe("ClubCard", () => {
  beforeEach(() => sessionStorage.clear());

  it("shows the club name, a location placeholder and a link to the team filter", () => {
    render(<ClubCard name={CLUB.name} tournamentId={CLUB.tournamentId} />);

    expect(screen.getByText("Generate & Co")).toBeInTheDocument();
    expect(screen.getByText(/Location TBC/)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/tournaments/t1/fencers?team=Generate%20%26%20Co",
    );
    expect(screen.getByRole("button", { name: "Pin Generate & Co" })).toBeInTheDocument();
  });

  it.each([
    { name: "pins", clicks: 1, pressed: "true", label: "Unpin Generate & Co", stored: [CLUB] },
    { name: "unpins", clicks: 2, pressed: "false", label: "Pin Generate & Co", stored: [] },
  ])("$name the club when the pin is clicked $clicks time(s)", ({ clicks, pressed, label, stored }) => {
    render(<ClubCard name={CLUB.name} tournamentId={CLUB.tournamentId} />);

    for (let i = 0; i < clicks; i++) {
      fireEvent.click(screen.getByRole("button", { name: /pin Generate/i }));
    }

    expect(screen.getByRole("button", { name: label })).toHaveAttribute("aria-pressed", pressed);
    expect(storedClubs()).toEqual(stored);
  });
});
