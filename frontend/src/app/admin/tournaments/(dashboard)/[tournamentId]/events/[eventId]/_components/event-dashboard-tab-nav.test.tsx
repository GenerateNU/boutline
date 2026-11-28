import { render, screen } from "@testing-library/react";

import { EventDashboardTabNav } from "./event-dashboard-tab-nav";

const BASE = "/admin/tournaments/t1/events/e1";
let mockPathname = BASE;

jest.mock("next/navigation", () => ({
  useParams: () => ({ tournamentId: "t1", eventId: "e1" }),
  usePathname: () => mockPathname,
}));

describe("EventDashboardTabNav", () => {
  it.each([
    [BASE, "Pools"],
    [`${BASE}/pools/p1`, "Pools"],
    [`${BASE}/fencers`, "Fencers"],
    [`${BASE}/results`, "Results"],
    [`${BASE}/settings`, "Settings"],
  ])("%s marks %s current", (pathname, label) => {
    mockPathname = pathname;
    render(<EventDashboardTabNav />);

    const current = screen.getAllByRole("link").filter((l) => l.getAttribute("aria-current") === "page");
    expect(current.map((l) => l.textContent)).toEqual([label]);
  });
});
