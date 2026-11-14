import { render, screen } from "@testing-library/react";

import { TournamentInfoCard } from "./tournament-info-card";

describe("TournamentInfoCard", () => {
  const cases = [
    {
      name: "dates and location",
      dates: "October 5 – October 7, 2026",
      location: "Sherman Center, Boston, MA",
      shown: ["October 5 – October 7, 2026", "Sherman Center, Boston, MA", "Organizer contact TBC"],
    },
    {
      name: "dates only",
      dates: "October 5",
      location: null,
      shown: ["October 5", "Location TBC", "Organizer contact TBC"],
    },
    {
      name: "location only",
      dates: null,
      location: "Boston, US",
      shown: ["Dates TBC", "Boston, US", "Organizer contact TBC"],
    },
    {
      name: "neither",
      dates: null,
      location: null,
      shown: ["Dates TBC", "Location TBC", "Organizer contact TBC"],
    },
  ];

  it.each(cases)("renders $name", ({ dates, location, shown }) => {
    const { container } = render(
      <TournamentInfoCard name="Boston Open" dates={dates} location={location} />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Boston Open" })).toBeInTheDocument();
    const rows = Array.from(container.querySelectorAll("[data-slot='label']")).map(
      (row) => row.textContent,
    );
    expect(rows).toEqual(shown);
  });
});
