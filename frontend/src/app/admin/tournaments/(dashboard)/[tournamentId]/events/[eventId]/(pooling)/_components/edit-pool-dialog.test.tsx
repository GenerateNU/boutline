import { fireEvent, render, screen } from "@testing-library/react";

import { Toaster } from "@/components/primitives/toast";
import { listEventCompetitors } from "@/features/competitor/services/listEventCompetitors";
import type { PoolBoard } from "@/features/pool/types/pool-board";
import { apiRequest } from "@/services/api-request";
import type { Competitor } from "@/types/competitor";

import { EditPoolDialog } from "./edit-pool-dialog";

const refresh = jest.fn();
const onOpenChange = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
jest.mock("../../../../../../../../../services/api-request", () => ({ apiRequest: jest.fn() }));
jest.mock("../../../../../../../../../features/competitor/services/listEventCompetitors", () => ({
  listEventCompetitors: jest.fn(),
}));

const STANDING = { place: 1, victories: 0, matches: 0, victory_ratio: 0, touches_scored: 0, touches_received: 0, indicator: 0 };
// Listed out of order to prove the form sorts by position.
const POOL: PoolBoard = {
  id: "p1",
  pool_stage_id: "s1",
  number: 2,
  strip: "Strip 5",
  status: "upcoming",
  start_time: null,
  started_at: null,
  completed_at: null,
  bouts: [],
  fencers: [3, 1, 2, 4].map((position) => ({
    competitor_id: `c${position}`,
    position,
    first_name: `F${position}`,
    last_name: "Smith",
    team: "Club",
    standing: STANDING,
  })),
};
const EXTRA: Competitor = {
  id: "c9",
  eventId: "e1",
  firstName: "Zed",
  lastName: "Smith",
  rating: "B",
  ratingYear: null,
  team: "Club",
  checkedInAt: "2026-01-01",
};

function renderDialog(maxFencers = 5) {
  render(
    <Toaster>
      <EditPoolDialog
        pool={POOL}
        onOpenChange={onOpenChange}
        tournamentId="t1"
        eventId="e1"
        maxFencers={maxFencers}
        excludedIds={[]}
      />
    </Toaster>,
  );
}

describe("EditPoolDialog", () => {
  beforeEach(() => {
    refresh.mockClear();
    onOpenChange.mockClear();
    jest.mocked(apiRequest).mockReset().mockResolvedValue({});
    jest.mocked(listEventCompetitors).mockResolvedValue([EXTRA]);
  });

  it("prefills the form and shows the status", () => {
    renderDialog();

    expect(screen.getByLabelText("Number")).toHaveValue(2);
    expect(screen.getByLabelText("Strip")).toHaveValue("5");
    expect(screen.getByLabelText("Status")).toHaveValue("Upcoming");
    expect(screen.getByText("F1 Smith")).toBeInTheDocument();
  });

  it("omits fencers when the list is unchanged", async () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText("Strip"), { target: { value: "7" } });

    fireEvent.click(screen.getByRole("button", { name: "Confirm edits" }));

    expect(await screen.findByText("Pool updated")).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith("/pools/p1", {
      method: "PATCH",
      body: JSON.stringify({ number: 2, strip: "Strip 7" }),
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("sends the ordered fencers when they changed", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Add fencer" }));
    fireEvent.click(await screen.findByRole("checkbox", { name: "Zed Smith" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Confirm edits" }).at(-1)!);
    fireEvent.click(await screen.findByRole("button", { name: "Confirm edits" }));

    await screen.findByText("Pool updated");
    expect(apiRequest).toHaveBeenCalledWith("/pools/p1", {
      method: "PATCH",
      body: JSON.stringify({ number: 2, strip: "Strip 5", fencers: ["c1", "c2", "c3", "c4", "c9"] }),
    });
  });

  it("disables confirm above the maximum fencers", () => {
    renderDialog(3);

    expect(screen.getByRole("button", { name: "Confirm edits" })).toBeDisabled();
  });

  it("shows the error and stays open on failure", async () => {
    jest.mocked(apiRequest).mockRejectedValue(new Error("pool already started"));
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Confirm edits" }));

    expect(await screen.findByText("pool already started")).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
