import { fireEvent, render, screen } from "@testing-library/react";

import { PINNED_STORAGE_KEY } from "@/features/pinning/types/pinning";

import type { TableauBout } from "../../_types/tableau";
import { BracketMatch } from "./bracket-match";
import { DIMMED_OVERLAY } from "./dimmed-overlay";

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
  location?: string,
): TableauBout => ({
  id: "b-1",
  number: 1,
  status,
  location,
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

// The card frame (border, background) is the link's wrapper, which also holds the pin.
function card() {
  return screen.getByRole("link").parentElement;
}

function storedBoutIds() {
  return JSON.parse(window.sessionStorage.getItem(PINNED_STORAGE_KEY) ?? "{}")
    .boutIds;
}

describe("BracketMatch", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

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

    expect(card()).toHaveClass("border-accent-green");
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
    expect(card()).not.toHaveClass("border-accent-green");
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

    expect(card()).toHaveClass(
      "border-blue-vivid",
      "border-2",
    );
    expect(card()).not.toHaveClass("border-accent-green");
  });

  it("greys out a bout that doesn't match the search, pin included, without fading its text", () => {
    renderMatch(bout("ended", 15, 11), { dimmed: true });

    expect(card()).toHaveClass(...DIMMED_OVERLAY.split(" "));
    expect(card()).toContainElement(
      screen.getByRole("button", { name: "Pin bout" }),
    );
    expect(card()).not.toHaveClass("opacity-40");
  });

  it.each([
    { name: "its location", location: "Strip 3", want: "Strip 3" },
    { name: "TBA Location when it has none", location: undefined, want: "TBA Location" },
  ])("shows $name in the header", ({ location, want }) => {
    renderMatch(bout("upcoming", undefined, undefined, location));

    expect(screen.getByRole("link")).toHaveTextContent(want);
    expect(screen.getByText(want)).toHaveClass("uppercase");
  });

  it("pins and unpins the bout, turning the card light blue while pinned", () => {
    renderMatch(bout("ended", 15, 11));

    fireEvent.click(screen.getByRole("button", { name: "Pin bout" }));

    expect(
      screen.getByRole("button", { name: "Unpin bout" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(storedBoutIds()).toEqual(["b-1"]);
    expect(card()).toHaveClass("bg-blue-lightest");

    fireEvent.click(screen.getByRole("button", { name: "Unpin bout" }));

    expect(screen.getByRole("button", { name: "Pin bout" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(storedBoutIds()).toEqual([]);
    expect(card()).toHaveClass("bg-card");
  });

  it("keeps the pin outside the link so pressing it doesn't open the bout", () => {
    renderMatch(bout("ended", 15, 11));

    expect(screen.getByRole("link")).not.toContainElement(
      screen.getByRole("button", { name: "Pin bout" }),
    );
  });
});
