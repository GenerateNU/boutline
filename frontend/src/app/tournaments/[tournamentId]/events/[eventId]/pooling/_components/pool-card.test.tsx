import { fireEvent, render, screen, within } from "@testing-library/react";

import { poolBoards } from "../_services/pools";

import { PoolCard } from "./pool-card";

const poolingPath = "/tournaments/t/events/e/pooling";

function renderCard() {
  render(<PoolCard pool={poolBoards[0]} poolingPath={poolingPath} />);
}

describe("PoolCard", () => {
  it("renders the title, status and bouts table", () => {
    renderCard();

    expect(screen.getByRole("heading", { name: "Pool 1 · Strip 3" })).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: /Wang, Yan/ })).getByRole("cell", { name: "V5" })).toBeInTheDocument();
  });

  it("switches to standings", () => {
    renderCard();

    fireEvent.click(screen.getByRole("radio", { name: "Standings" }));

    expect(screen.getByRole("columnheader", { name: "Place" })).toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: "V5" })).not.toBeInTheDocument();
  });

  it("links to the pool page", () => {
    renderCard();

    expect(screen.getByRole("link", { name: "View pool" })).toHaveAttribute("href", `${poolingPath}/pool-1`);
  });
});
