import { render, screen, within } from "@testing-library/react";

import { RefereeCard } from "@/features/referee/components/referee-card";

describe("RefereeCard", () => {
  it.each([
    {
      name: "two referees",
      referees: [
        { id: "1", name: "Yan Wang", occupied: true, pool: "Pool 1" },
        { id: "2", name: "Ana Diaz", occupied: false },
      ],
      rows: [
        ["Yan Wang", "Occupied", "Pool 1"],
        ["Ana Diaz", "Available"],
      ],
    },
    { name: "no referees", referees: [], rows: [] },
  ])("renders $name", ({ referees, rows }) => {
    render(<RefereeCard referees={referees} />);

    expect(screen.getByText("Referees:")).toBeInTheDocument();
    const items = screen.queryAllByRole("listitem");
    expect(items).toHaveLength(rows.length);
    rows.forEach((row, i) => {
      row.forEach((text) => expect(within(items[i]).getByText(text)).toBeInTheDocument());
      expect(within(items[i]).getByRole("button", { name: "Remove" })).toBeInTheDocument();
    });
  });
});
