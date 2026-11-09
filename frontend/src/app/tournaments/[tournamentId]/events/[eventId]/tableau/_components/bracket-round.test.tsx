import { render, screen } from "@testing-library/react";

import type { TableauBout, TableauRound } from "../../_types/tableau";
import { BracketRound } from "./bracket-round";

const fencer = (id: string, firstName: string) => ({
  id,
  firstName,
  lastName: "Fencer",
  club: "",
  seed: 1,
});

const bout = (number: number): TableauBout => ({
  id: `b-${number}`,
  number,
  status: "upcoming",
  top: fencer(`top-${number}`, "Maya"),
  bottom: fencer(`bottom-${number}`, "Kenji"),
});

const round = (size: number, bouts: TableauBout[]): TableauRound => ({
  id: String(size),
  size,
  name: "Quarter-finals",
  boutName: "Quarter-final",
  bouts,
});

function renderRound(testRound: TableauRound) {
  render(
    <BracketRound round={testRound} isLast={false} query="" boutBasePath="/bout" ref={null} />,
  );
}

describe("BracketRound", () => {
  it("puts a lone bout in the slot matching its number, after placeholders", () => {
    renderRound(round(8, [bout(4)]));

    const placeholders = screen.getAllByRole("group", { name: "Bout to be announced" });
    const link = screen.getByRole("link");

    expect(placeholders).toHaveLength(3);
    expect(link).toHaveAttribute("href", "/bout/b-4");
    expect(placeholders[2].compareDocumentPosition(link)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("shows the first bout when two share a number", () => {
    renderRound(round(2, [bout(1), { ...bout(1), id: "duplicate" }]));

    expect(screen.getByRole("link")).toHaveAttribute("href", "/bout/b-1");
  });

  it("renders a placeholder for every slot of a round with no bouts", () => {
    renderRound(round(8, []));

    expect(screen.getAllByRole("group", { name: "Bout to be announced" })).toHaveLength(4);
  });
});
