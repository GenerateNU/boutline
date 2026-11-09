import { fireEvent, render, screen, within } from "@testing-library/react";

import { poolTitle } from "../../_services/pool-title";
import { poolBoards } from "../../_services/pools";

import { PoolBouts } from "./pool-bouts";

const fencersPath = "/tournaments/t/events/e/fencers";
const pool = poolBoards[0];

function renderBouts() {
  render(<PoolBouts pool={pool} fencersPath={fencersPath} />);
}

function tap(name: string) {
  fireEvent.click(screen.getByRole("button", { name }));
}

const standings = () => screen.queryByRole("table", { name: `${poolTitle(pool)} standings` });
const card = () => screen.queryByRole("region", { name: "Pool bout" });

describe("PoolBouts", () => {
  it.each([
    ["nothing is tapped", () => {}, true],
    ["a bout is selected", () => tap("Yan Wang vs Caitlin Lee"), false],
  ])("shows standings and the tapped-bout line correctly when %s", (_, act, idle) => {
    renderBouts();
    act();

    expect(!!standings()).toBe(idle);
    expect(!!card()).toBe(!idle);
    expect(!!screen.queryByText("Showing the bout you tapped")).toBe(!idle);
  });

  it("selects both mirrored cells and shows the finished bout", () => {
    renderBouts();
    tap("Yan Wang vs Caitlin Lee");

    expect(screen.getByRole("button", { name: "Yan Wang vs Caitlin Lee" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Caitlin Lee vs Yan Wang" })).toHaveAttribute("aria-pressed", "true");

    const region = within(card()!);
    expect(region.getByText("Bout 1 of 6")).toBeInTheDocument();
    expect(region.getByText("Final")).toBeInTheDocument();
    expect(region.getByText("3")).toBeInTheDocument();
  });

  it("shows an unfenced bout as upcoming", () => {
    renderBouts();
    tap("Caitlin Lee vs Claire Min");

    expect(within(card()!).getByText("Upcoming")).toBeInTheDocument();
  });

  it.each([
    ["tapping the selected bout again", () => tap("Yan Wang vs Caitlin Lee")],
    ["All bouts", () => fireEvent.click(screen.getByRole("button", { name: "All bouts" }))],
  ])("clears the selection and restores standings on %s", (_, deselect) => {
    renderBouts();
    tap("Yan Wang vs Caitlin Lee");
    deselect();

    expect(card()).not.toBeInTheDocument();
    expect(standings()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yan Wang vs Caitlin Lee" })).toHaveAttribute("aria-pressed", "false");
  });

  it("links each fencer to the fencers page", () => {
    renderBouts();
    tap("Yan Wang vs Caitlin Lee");

    expect(within(card()!).getByRole("link", { name: "Yan Wang" })).toHaveAttribute("href", fencersPath);
  });
});
