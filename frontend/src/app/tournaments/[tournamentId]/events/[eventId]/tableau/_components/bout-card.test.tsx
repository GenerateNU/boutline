import { render, screen } from "@testing-library/react";

import type { TableauBout } from "../../_types/tableau";
import { BoutCard } from "./bout-card";

const fencer = (id: string, firstName: string) => ({ id, firstName, lastName: "Fencer", club: "Club", seed: 1 });

const bout = (status: TableauBout["status"], topScore?: number, bottomScore?: number): TableauBout => ({
  id: "b-1",
  number: 1,
  status,
  top: fencer("t", "Maya"),
  bottom: fencer("b", "Kenji"),
  topScore,
  bottomScore,
});

function renderCard(testBout: TableauBout, nextLabel?: string) {
  render(<BoutCard bout={testBout} title="Bout 1" nextLabel={nextLabel} href="/bout/b-1" />);
}

describe("BoutCard", () => {
  it("shows the title, both fencers and the bout the winner feeds into", () => {
    renderCard(bout("upcoming"), "Final");

    expect(screen.getByText("Bout 1")).toBeInTheDocument();
    expect(screen.getByText("Maya Fencer")).toBeInTheDocument();
    expect(screen.getByText("Kenji Fencer")).toBeInTheDocument();
    expect(screen.getByText(/Winner/).textContent).toBe("Winner  Final");
  });

  it("marks the winner of an ended bout with a green score and grays the loser's name", () => {
    renderCard(bout("ended", 15, 11));

    expect(screen.getByText("15")).toHaveClass("bg-green");
    expect(screen.getByText("Maya Fencer")).toHaveClass("text-obsidian");
    expect(screen.getByText("Kenji Fencer")).toHaveClass("text-neutral-secondary");
  });

  it("gives a live bout a green border and a mint and blue score", () => {
    renderCard(bout("active", 2, 3));

    expect(screen.getByRole("link")).toHaveClass("border-accent-green");
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.getByText("2")).toHaveClass("bg-mint-light");
    expect(screen.getByText("3")).toHaveClass("bg-blue-soft");
  });

  it("shows dashes for a bout that hasn't started", () => {
    renderCard(bout("upcoming"));

    expect(screen.getAllByText("–")).toHaveLength(2);
  });
});
