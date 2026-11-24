import { fireEvent, render, screen, within } from "@testing-library/react";

import { buildPoolStageResult } from "../_fixtures/build-pool-stage-result";

import { PoolStageResults } from "./pool-stage-results";

const RESULTS = [
  buildPoolStageResult({ competitor_id: "chen", place: 1, status: "advanced", victory_ratio: 1 }),
  buildPoolStageResult({
    competitor_id: "kowalski",
    place: 2,
    first_name: "Ethan",
    last_name: "Kowalski",
    club: null,
    status: "eliminated",
    victories: 1,
    victory_ratio: 1 / 3,
    touches_scored: 8,
  }),
];

function rowTexts() {
  return within(screen.getByRole("table"))
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent));
}

describe("PoolStageResults", () => {
  it("lists each fencer's place, status and stats in ranking order", () => {
    render(<PoolStageResults results={RESULTS} />);

    expect(screen.getByRole("rowheader", { name: "Maya Chen Boston Fencing Club" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "Ethan Kowalski" })).toBeInTheDocument();
    expect(rowTexts()).toEqual([
      ["1", "Advanced", "3", "1.00", "15"],
      ["2", "Eliminated", "1", "0.33", "8"],
    ]);
  });

  it("shows only the statuses present in the legend", () => {
    render(<PoolStageResults results={[buildPoolStageResult({ status: "pending" })]} />);

    const legend = screen.getByRole("list", { name: "Status legend" });
    expect(within(legend).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Pending"]);
  });

  it("narrows the table to fencers matching the search", () => {
    render(<PoolStageResults results={RESULTS} />);

    fireEvent.change(screen.getByRole("searchbox", { name: "Search pool results" }), {
      target: { value: "kowal" },
    });

    expect(rowTexts()).toEqual([["2", "Eliminated", "1", "0.33", "8"]]);
  });

  it.each([
    { name: "no results yet", results: [], search: "", want: "No pool results yet." },
    { name: "a search with no match", results: RESULTS, search: "zzz", want: "No fencers match your search or filters." },
  ])("says so when there are $name", ({ results, search, want }) => {
    render(<PoolStageResults results={results} />);

    fireEvent.change(screen.getByRole("searchbox", { name: "Search pool results" }), {
      target: { value: search },
    });

    expect(screen.getByText(want)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
