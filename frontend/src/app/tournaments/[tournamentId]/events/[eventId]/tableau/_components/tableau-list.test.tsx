import { render, screen } from "@testing-library/react";

import type { TableauBout, TableauRound } from "../../_types/tableau";
import { TableauList } from "./tableau-list";

const bout = (number: number, firstName: string, lastName: string): TableauBout => ({
  id: `b-${number}`,
  number,
  status: "upcoming",
  top: { id: `t-${number}`, firstName, lastName, club: "", seed: 1 },
  bottom: { id: `u-${number}`, firstName: "Kenji", lastName: "Tanaka", club: "", seed: 8 },
});

const rounds: TableauRound[] = [
  {
    id: "4",
    size: 4,
    name: "Semi-finals",
    boutName: "Semi-final",
    bouts: [bout(1, "Maya", "Chen"), bout(2, "Ana", "Silva")],
  },
  { id: "2", size: 2, name: "Finals", boutName: "Final", bouts: [] },
];

function renderList(selectedRoundId: string, query = "") {
  render(
    <TableauList rounds={rounds} selectedRoundId={selectedRoundId} query={query} boutBasePath="/bout" />,
  );
}

describe("TableauList", () => {
  it("lists the selected round's bouts with the bout they feed into", () => {
    renderList("4");

    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/bout/b-1",
      "/bout/b-2",
    ]);
    expect(screen.getAllByText(/Winner/).map((el) => el.textContent)).toEqual([
      "Winner  Final",
      "Winner  Final",
    ]);
  });

  it("shows only bouts matching the search", () => {
    renderList("4", "silva");

    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/bout/b-2");
  });

  it.each([
    { name: "a round with no bouts", roundId: "2", query: "", want: "No bouts in this round yet." },
    { name: "a search nothing matches", roundId: "4", query: "zzz", want: "No bouts match your search." },
  ])("explains $name", ({ roundId, query, want }) => {
    renderList(roundId, query);

    expect(screen.getByText(want)).toBeInTheDocument();
  });

  it("falls back to the first round for an unknown round id", () => {
    renderList("missing");

    expect(screen.getAllByRole("link")).toHaveLength(2);
  });
});
