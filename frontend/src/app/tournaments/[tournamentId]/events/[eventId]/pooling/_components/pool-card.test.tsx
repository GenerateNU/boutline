import { fireEvent, render, screen, within } from "@testing-library/react";

import { poolBoards } from "../_services/pools";

import { PoolCard } from "./pool-card";

const poolingPath = "/tournaments/t/events/e/pooling";

function renderCard() {
  render(<PoolCard pool={poolBoards[0]} poolingPath={poolingPath} />);
  return screen.getByRole("button", { name: "Pool 1 - Strip 3" });
}

describe("PoolCard", () => {
  it("renders open with the title, status and bouts table", () => {
    const trigger = renderCard();

    expect(screen.getByRole("heading", { name: "Pool 1 - Strip 3" })).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(within(screen.getByRole("row", { name: /Yan Wang/ })).getByRole("cell", { name: "V5" })).toBeInTheDocument();
  });

  it("switches to standings", () => {
    renderCard();

    fireEvent.click(screen.getByRole("radio", { name: "Standings" }));

    expect(screen.getByRole("columnheader", { name: "V/M" })).toBeInTheDocument();
    expect(screen.getAllByRole("cell", { name: "0.50" }).length).toBeGreaterThan(0);
  });

  it("collapses to just the header", () => {
    const trigger = renderCard();

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("heading", { name: "Pool 1 - Strip 3" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View Pool" })).not.toBeInTheDocument();
  });

  it("links to the pool page", () => {
    renderCard();

    expect(screen.getByRole("link", { name: "View Pool" })).toHaveAttribute("href", `${poolingPath}/pool-1`);
  });
});
