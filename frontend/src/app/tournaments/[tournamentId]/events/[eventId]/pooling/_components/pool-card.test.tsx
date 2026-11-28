import { fireEvent, render, screen, within } from "@testing-library/react";

import { buildPool } from "@/features/pool/fixtures/build-pool";

import { PoolCard } from "./pool-card";

const poolingPath = "/tournaments/t/events/e/pooling";
const EVENT = { tournamentId: "t", eventId: "e" };

const pool = buildPool({
  number: 1,
  strip: "Strip 3",
  fencers: [
    ["Yan", "Wang", "New York Fencers Club"],
    ["Caitlin", "Lee", "New York Fencers Club"],
  ],
  bouts: [[1, 2, 5, 2]],
});

function renderCard() {
  render(<PoolCard pool={pool} poolingPath={poolingPath} event={EVENT} />);
}

describe("PoolCard", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("renders the title, status and bouts table", () => {
    renderCard();

    expect(screen.getByRole("heading", { name: "Pool 1 · Strip 3" })).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: /Wang, Yan/ })).getByRole("cell", { name: "V5" })).toBeInTheDocument();
  });

  it("puts the pin in the header, right after the status chip", () => {
    renderCard();

    const status = screen.getByText("In Progress");
    const pin = screen.getByRole("button", { name: "Pin Pool 1 · Strip 3" });

    expect(pin.parentElement).toBe(status.parentElement);
    expect(status.nextElementSibling).toBe(pin);
  });

  it("switches to standings", () => {
    renderCard();

    fireEvent.click(screen.getByRole("radio", { name: "Standings" }));

    expect(screen.getByRole("columnheader", { name: "Place" })).toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: "V5" })).not.toBeInTheDocument();
  });

  it("turns light blue once pinned", () => {
    renderCard();
    const card = screen.getByRole("article");
    expect(card).toHaveClass("bg-card");

    fireEvent.click(screen.getByRole("button", { name: "Pin Pool 1 \u00b7 Strip 3" }));

    expect(screen.getByRole("button", { name: "Unpin Pool 1 \u00b7 Strip 3" })).toHaveAttribute("aria-pressed", "true");
    expect(card).toHaveClass("border-blue-light", "bg-blue-lightest");
  });

  it("links to the pool page", () => {
    renderCard();

    expect(screen.getByRole("link", { name: "View pool" })).toHaveAttribute("href", `${poolingPath}/pool-1`);
  });
});
