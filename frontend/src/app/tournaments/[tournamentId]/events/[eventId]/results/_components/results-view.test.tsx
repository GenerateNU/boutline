import { render, screen, within } from "@testing-library/react";

import type { ResultFencer, ResultStatus } from "../../_types/results";
import { ResultsView } from "./results-view";

function fencer(id: string, lastName: string, place: number, status: ResultStatus): ResultFencer {
  return {
    id,
    firstName: "Fen",
    lastName,
    club: "Boston Blade",
    rating: "A26",
    place,
    pool: 1,
    strip: "3",
    status,
  };
}

function renderView(fencers: ResultFencer[], action?: React.ReactNode) {
  render(<ResultsView fencers={fencers} eventName="Senior Epee" eventStatus="active" action={action} />);
}

const section = (name: string) => within(screen.getByRole("heading", { name }).closest("section")!);

describe("ResultsView", () => {
  it("shows an empty message without results", () => {
    renderView([]);

    expect(screen.getByText("No pool results yet.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Qualifiers" })).not.toBeInTheDocument();
  });

  it("lists standings in place order before the tableau is drawn", () => {
    renderView([fencer("1", "Adams", 1, "pending"), fencer("2", "Baker", 2, "pending")]);

    expect(screen.getByRole("heading", { name: "Standings" })).toBeInTheDocument();
    expect(screen.getByText("Qualifiers are set once the tableau is drawn.")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      expect.stringContaining("Adams"),
      expect.stringContaining("Baker"),
    ]);
    expect(screen.queryByText("fencers qualified")).not.toBeInTheDocument();
  });

  it("splits qualifiers from disqualifiers once drawn", () => {
    renderView([
      fencer("1", "Adams", 1, "advanced"),
      fencer("2", "Baker", 2, "advanced"),
      fencer("3", "Clark", 3, "eliminated"),
    ]);

    expect(screen.getByText("2 Qualifiers")).toBeInTheDocument();
    expect(screen.getByText("1 Disqualifiers")).toBeInTheDocument();
    expect(screen.getByText("67%")).toBeInTheDocument();
    expect(section("Qualifiers").getByText(/Adams/)).toBeInTheDocument();
    expect(section("Qualifiers").getByText(/Baker/)).toBeInTheDocument();
    expect(section("Qualifiers").queryByText(/Clark/)).not.toBeInTheDocument();
    expect(section("Disqualifiers").getByText(/Clark/)).toBeInTheDocument();
  });

  it("leaves out the qualifiers section when every fencer was eliminated", () => {
    renderView([fencer("1", "Adams", 1, "eliminated")]);

    expect(screen.getByText("0 Qualifiers")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Qualifiers" })).not.toBeInTheDocument();
    expect(section("Disqualifiers").getByText(/Adams/)).toBeInTheDocument();
  });

  it("renders the action", () => {
    renderView([fencer("1", "Adams", 1, "pending")], <button type="button">End pool stage</button>);

    expect(screen.getByRole("button", { name: "End pool stage" })).toBeInTheDocument();
  });
});
