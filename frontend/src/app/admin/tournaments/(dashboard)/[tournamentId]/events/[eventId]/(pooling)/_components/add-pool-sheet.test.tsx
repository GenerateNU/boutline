import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { Toaster } from "@/components/primitives/toast";
import { listEventCompetitors } from "@/features/competitor/services/listEventCompetitors";
import { apiRequest } from "@/services/api-request";
import type { Competitor } from "@/types/competitor";

import { AddPoolSheet } from "./add-pool-sheet";

const refresh = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
jest.mock("../../../../../../../../../services/api-request", () => ({ apiRequest: jest.fn() }));
jest.mock("../../../../../../../../../features/competitor/services/listEventCompetitors", () => ({
  listEventCompetitors: jest.fn(),
}));

const NAMES = ["Ann", "Bob", "Cy", "Di", "Ed"];
const COMPETITORS: Competitor[] = NAMES.map((firstName, index) => ({
  id: `c${index}`,
  eventId: "e1",
  firstName,
  lastName: "Smith",
  rating: "A",
  ratingYear: 26,
  team: "Club",
  checkedInAt: "2026-01-01",
}));

async function addFencers(count: number) {
  fireEvent.click(screen.getByRole("button", { name: "Add Pools" }));
  fireEvent.click(await screen.findByRole("button", { name: "Add fencer" }));
  for (const name of NAMES.slice(0, count)) {
    fireEvent.click(await screen.findByRole("checkbox", { name: `${name} Smith` }));
  }
  fireEvent.click(screen.getByRole("button", { name: "Confirm edits" }));
}

function renderSheet(maxFencers = 5) {
  render(
    <Toaster>
      <AddPoolSheet
        tournamentId="t1"
        eventId="e1"
        poolStageId="s1"
        maxFencers={maxFencers}
        nextNumber={3}
        excludedIds={[]}
      />
    </Toaster>,
  );
}

describe("AddPoolSheet", () => {
  beforeEach(() => {
    refresh.mockClear();
    jest.mocked(apiRequest).mockReset().mockResolvedValue({});
    jest.mocked(listEventCompetitors).mockResolvedValue(COMPETITORS);
  });

  const cases = [
    { name: "disabled below 4 fencers", count: 3, maxFencers: 5, enabled: false },
    { name: "enabled at 4 fencers", count: 4, maxFencers: 5, enabled: true },
    { name: "disabled above the maximum", count: 5, maxFencers: 4, enabled: false },
  ];

  it.each(cases)("Add Pool is $name", async ({ count, maxFencers, enabled }) => {
    renderSheet(maxFencers);
    await addFencers(count);

    await waitFor(() => expect(screen.getByRole("button", { name: "Add Pool" })).toHaveProperty("disabled", !enabled));
  });

  it("posts the pool, toasts and refreshes", async () => {
    renderSheet();
    await addFencers(4);
    fireEvent.change(screen.getByLabelText("Strip"), { target: { value: "2" } });

    fireEvent.click(screen.getByRole("button", { name: "Add Pool" }));

    expect(await screen.findByText("Pool 3 added")).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith("/pools", {
      method: "POST",
      body: JSON.stringify({
        pools: [{ pool_stage_id: "s1", number: 3, strip: "Strip 2", fencers: ["c0", "c1", "c2", "c3"] }],
      }),
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("shows the error and does not refresh on failure", async () => {
    jest.mocked(apiRequest).mockRejectedValue(new Error("pool number taken"));
    renderSheet();
    await addFencers(4);

    fireEvent.click(screen.getByRole("button", { name: "Add Pool" }));

    expect(await screen.findByText("pool number taken")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});
