import { fireEvent, render, screen, within } from "@testing-library/react";

import { poolBoards } from "../../_services/pools";

import { PoolBouts } from "./pool-bouts";

const fencersPath = "/tournaments/t/events/e/fencers";

function renderBouts() {
  render(<PoolBouts pool={poolBoards[0]} fencersPath={fencersPath} />);
}

function tap(name: string) {
  fireEvent.click(screen.getByRole("button", { name }));
}

describe("PoolBouts", () => {
  it("shows nothing below the grid until a bout is selected", () => {
    renderBouts();

    expect(screen.queryByText("Showing the bout you tapped")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Bout" })).not.toBeInTheDocument();
  });

  it("selects both mirrored cells and shows the finished bout", () => {
    renderBouts();
    tap("Yan Wang vs Caitlin Lee");

    expect(screen.getByRole("button", { name: "Yan Wang vs Caitlin Lee" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Caitlin Lee vs Yan Wang" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Showing the bout you tapped")).toBeInTheDocument();

    const card = within(screen.getByRole("region", { name: "Bout" }));
    expect(card.getByText("Bout 1 of 6")).toBeInTheDocument();
    expect(card.getByText("Yan Wang won 5-2")).toBeInTheDocument();
    expect(card.getByText("Final")).toBeInTheDocument();
    expect(card.getByText("3")).toBeInTheDocument();
  });

  it("shows an unfenced bout as upcoming", () => {
    renderBouts();
    tap("Caitlin Lee vs Claire Min");

    const card = within(screen.getByRole("region", { name: "Bout" }));
    expect(card.getByText("Not fenced yet")).toBeInTheDocument();
    expect(card.getByText("Upcoming")).toBeInTheDocument();
  });

  it.each([
    ["tapping the selected bout again", () => tap("Yan Wang vs Caitlin Lee")],
    ["Show all bouts", () => fireEvent.click(screen.getByRole("button", { name: "Show all bouts" }))],
  ])("hides the card on %s", (_, deselect) => {
    renderBouts();
    tap("Yan Wang vs Caitlin Lee");
    deselect();

    expect(screen.queryByRole("region", { name: "Bout" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yan Wang vs Caitlin Lee" })).toHaveAttribute("aria-pressed", "false");
  });

  it("links each fencer to the fencers page", () => {
    renderBouts();
    tap("Yan Wang vs Caitlin Lee");

    const card = within(screen.getByRole("region", { name: "Bout" }));
    expect(card.getByRole("link", { name: "Yan Wang" })).toHaveAttribute("href", fencersPath);
  });
});
