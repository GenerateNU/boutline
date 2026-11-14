import { fireEvent, render, screen } from "@testing-library/react";

import type { Tableau } from "../../_types/tableau";
import { TableauView } from "./tableau-view";

const fencer = (id: string, firstName: string) => ({
  id,
  firstName,
  lastName: "Fencer",
  club: "",
  seed: 1,
});

const TABLEAU: Tableau = {
  rounds: [
    {
      id: "4",
      size: 4,
      name: "Semi-finals",
      boutName: "Semi-final",
      bouts: [
        {
          id: "b-1",
          number: 1,
          status: "upcoming",
          top: fencer("a", "Maya"),
          bottom: fencer("b", "Kenji"),
        },
        {
          id: "b-2",
          number: 2,
          status: "upcoming",
          top: fencer("c", "Ana"),
          bottom: fencer("d", "Luca"),
        },
      ],
    },
    { id: "2", size: 2, name: "Finals", boutName: "Final", bouts: [] },
  ],
};

const renderView = (value: Tableau = TABLEAU) =>
  render(<TableauView tableau={value} boutBasePath="/bout" />);

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

describe("TableauView", () => {
  it("says so when the tableau hasn't been drawn", () => {
    renderView({ rounds: [] });

    expect(
      screen.getByText("The tableau hasn't been drawn yet."),
    ).toBeInTheDocument();
  });

  it("starts on the bracket and switches to the list and back", () => {
    renderView();

    expect(screen.getByLabelText("Semi-finals")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show as list" }));
    expect(screen.queryByLabelText("Semi-finals")).not.toBeInTheDocument();
    expect(screen.getByText("Semi-final 1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show as bracket" }));
    expect(screen.getByLabelText("Semi-finals")).toBeInTheDocument();
  });

  it("filters the list by search text", () => {
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Show as list" }));

    fireEvent.change(
      screen.getByRole("textbox", { name: "Search fencers or clubs" }),
      {
        target: { value: "luca" },
      },
    );

    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByText("Semi-final 2")).toBeInTheDocument();
  });

  it("clears the search with the clear button", () => {
    renderView();
    const input = screen.getByRole("textbox", {
      name: "Search fencers or clubs",
    });
    expect(
      screen.queryByRole("button", { name: "Clear search" }),
    ).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "luca" } });
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));

    expect(input).toHaveValue("");
    expect(
      screen.queryByRole("button", { name: "Clear search" }),
    ).not.toBeInTheDocument();
  });

  it("shows the picked round in the list", () => {
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Show as list" }));

    fireEvent.click(screen.getByRole("button", { name: "Finals" }));

    expect(screen.getByText("No bouts in this round yet.")).toBeInTheDocument();
  });
});
