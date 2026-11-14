import { fireEvent, render, screen, within } from "@testing-library/react";

import { buildPool } from "../../_fixtures/build-pool";
import { poolTitle } from "../../_services/pool-title";

import { PoolBouts } from "./pool-bouts";

const fencersPath = "/tournaments/t/events/e/fencers";
const pool = buildPool({
  number: 1,
  strip: "Strip 3",
  fencers: [
    ["Yan", "Wang", "New York Fencers Club"],
    ["Caitlin", "Lee", "New York Fencers Club"],
    ["Claire", "Min", "Boston Fencing Club"],
  ],
  bouts: [
    [1, 2, 5, 2],
    [2, 3, 0, 0, "upcoming"],
    [3, 1, 5, 4],
  ],
});

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
    ["a bout is selected", () => tap("Wang, Yan vs Lee, Caitlin"), false],
  ])("shows standings and the tapped-bout line correctly when %s", (_, act, idle) => {
    renderBouts();
    act();

    expect(!!standings()).toBe(idle);
    expect(!!card()).toBe(!idle);
    expect(!!screen.queryByText("Showing the bout you tapped")).toBe(!idle);
  });

  it("selects both mirrored cells and shows the finished bout", () => {
    renderBouts();
    tap("Wang, Yan vs Lee, Caitlin");

    expect(screen.getByRole("button", { name: "Wang, Yan vs Lee, Caitlin" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Lee, Caitlin vs Wang, Yan" })).toHaveAttribute("aria-pressed", "true");

    const region = within(card()!);
    expect(region.getByText("Bout 1 of 3")).toBeInTheDocument();
    expect(region.getByText("Final")).toBeInTheDocument();
    expect(region.getByText("3")).toBeInTheDocument();
  });

  it("shows an unfenced bout as upcoming", () => {
    renderBouts();
    tap("Lee, Caitlin vs Min, Claire");

    expect(within(card()!).getByText("Upcoming")).toBeInTheDocument();
  });

  it.each([
    ["tapping the selected bout again", () => tap("Wang, Yan vs Lee, Caitlin")],
    ["All bouts", () => fireEvent.click(screen.getByRole("button", { name: "All bouts" }))],
  ])("clears the selection and restores standings on %s", (_, deselect) => {
    renderBouts();
    tap("Wang, Yan vs Lee, Caitlin");
    deselect();

    expect(card()).not.toBeInTheDocument();
    expect(standings()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Wang, Yan vs Lee, Caitlin" })).toHaveAttribute("aria-pressed", "false");
  });

  it("links each fencer to the fencers page", () => {
    renderBouts();
    tap("Wang, Yan vs Lee, Caitlin");

    expect(within(card()!).getByRole("link", { name: "Yan Wang" })).toHaveAttribute("href", fencersPath);
  });
});
