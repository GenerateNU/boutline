import { render, screen } from "@testing-library/react";

import type { TableauBout } from "../../_types/tableau";
import { BracketMatch } from "./bracket-match";

const fencer = (id: string, firstName: string) => ({
  id,
  firstName,
  lastName: "Fencer",
  club: "",
  seed: 1,
});

const bout = (
  status: TableauBout["status"],
  topScore?: number,
  bottomScore?: number,
): TableauBout => ({
  id: "b-1",
  number: 1,
  status,
  top: fencer("t", "Maya"),
  bottom: fencer("b", "Kenji"),
  topScore,
  bottomScore,
});

function renderMatch(
  testBout: TableauBout,
  props: { dimmed?: boolean; matched?: boolean } = {},
) {
  render(
    <BracketMatch
      bout={testBout}
      href="/bout/b-1"
      dimmed={props.dimmed ?? false}
      matched={props.matched}
    />,
  );
}

describe("BracketMatch", () => {
  it.each([
    { name: "the top fencer wins", top: 15, bottom: 11 },
    { name: "the bottom fencer wins", top: 9, bottom: 15 },
  ])("marks only the winner's score green when $name", ({ top, bottom }) => {
    renderMatch(bout("ended", top, bottom));

    expect(screen.getByText("15")).toHaveClass("bg-green");
    expect(screen.getByText(String(Math.min(top, bottom)))).not.toHaveClass(
      "bg-green",
    );
  });

  it("marks no score green when an ended bout is level", () => {
    renderMatch(bout("ended", 10, 10));

    expect(
      screen
        .getAllByText("10")
        .every((score) => !score.classList.contains("bg-green")),
    ).toBe(true);
  });

  it("gives a live bout a green border, a mint top score and a blue bottom score", () => {
    renderMatch(bout("active", 2, 3));

    expect(screen.getByRole("link")).toHaveClass("border-accent-green");
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.getByText("2")).toHaveClass("bg-mint-light");
    expect(screen.getByText("3")).toHaveClass("bg-blue-soft");
  });

  it("shows a dash instead of a score for a bout that hasn't started", () => {
    renderMatch(bout("upcoming"));

    const dashes = screen.getAllByText("–");
    expect(dashes).toHaveLength(2);
    expect(dashes.every((dash) => dash.classList.contains("bg-surface"))).toBe(
      true,
    );
    expect(screen.getByRole("link")).not.toHaveClass("border-accent-green");
  });

  it.each(["active", "ended"] as const)(
    "keeps both names dark on a %s bout",
    (status) => {
      renderMatch(bout(status, 1, 2));

      expect(screen.getByText("Maya Fencer")).toHaveClass("text-obsidian");
      expect(screen.getByText("Kenji Fencer")).toHaveClass("text-obsidian");
    },
  );

  it("grays both names on a bout that hasn't been fenced", () => {
    renderMatch(bout("upcoming"));

    expect(screen.getByText("Maya Fencer")).toHaveClass(
      "text-neutral-secondary",
    );
    expect(screen.getByText("Kenji Fencer")).toHaveClass(
      "text-neutral-secondary",
    );
  });

  it("outlines a search match in blue, even when the bout is live", () => {
    renderMatch(bout("active", 2, 3), { matched: true });

    expect(screen.getByRole("link")).toHaveClass(
      "border-blue-vivid",
      "border-2",
    );
    expect(screen.getByRole("link")).not.toHaveClass("border-accent-green");
  });

  it("greys out a bout that doesn't match the search without fading its text", () => {
    renderMatch(bout("ended", 15, 11), { dimmed: true });

    expect(screen.getByRole("link").className).toContain(
      "after:bg-obsidian/20",
    );
    expect(screen.getByRole("link")).not.toHaveClass("opacity-40");
  });
});
