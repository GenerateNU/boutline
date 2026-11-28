import { fireEvent, render, screen } from "@testing-library/react";

import { Toaster } from "@/components/primitives/toast";
import type { PoolBoard, PoolStatus } from "@/features/pool/types/pool-board";
import { apiRequest } from "@/services/api-request";

import { AdminPoolList } from "./admin-pool-list";

const refresh = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
jest.mock("../../../../../../../../../services/api-request", () => ({ apiRequest: jest.fn() }));

const apiRequestMock = jest.mocked(apiRequest);
const POOLS_PATH = "/admin/tournaments/t1/events/e1/pools";

function pool(status: PoolStatus): PoolBoard {
  return {
    id: "p1",
    pool_stage_id: "s1",
    number: 1,
    strip: "Strip 3",
    status,
    start_time: null,
    started_at: null,
    completed_at: null,
    fencers: [],
    bouts: [],
  };
}

function renderList(status: PoolStatus, editing: boolean) {
  render(
    <Toaster>
      <AdminPoolList
        pools={[pool(status)]}
        editing={editing}
        poolsPath={POOLS_PATH}
        tournamentId="t1"
        eventId="e1"
        maxFencers={10}
      />
    </Toaster>,
  );
}

describe("AdminPoolList", () => {
  beforeEach(() => {
    refresh.mockClear();
    apiRequestMock.mockReset();
  });

  const cases = [
    { editing: false, status: "upcoming", view: true, edit: false, del: false },
    { editing: false, status: "active", view: true, edit: false, del: false },
    { editing: true, status: "upcoming", view: false, edit: true, del: true },
    { editing: true, status: "active", view: false, edit: true, del: false },
    { editing: true, status: "ended", view: false, edit: true, del: false },
  ] as const;

  it.each(cases)("editing=$editing status=$status", ({ editing, status, view, edit, del }) => {
    renderList(status, editing);

    const viewLink = screen.queryByRole("link", { name: "View Pool" });
    expect(Boolean(viewLink)).toBe(view);
    if (viewLink) {
      expect(viewLink).toHaveAttribute("href", `${POOLS_PATH}/p1`);
    }
    expect(Boolean(screen.queryByRole("button", { name: "Edit Pool" }))).toBe(edit);
    // In edit mode the trash replaces the status badge, usable only before the pool starts.
    const deleteButton = screen.queryByRole("button", { name: "Delete pool" });
    expect(Boolean(deleteButton)).toBe(editing);
    expect(screen.queryByText(/upcoming|in progress|completed/i) === null).toBe(editing);
    if (deleteButton) {
      expect(deleteButton.hasAttribute("disabled")).toBe(!del);
    }
  });

  it("deletes the pool on confirm and refreshes", async () => {
    apiRequestMock.mockResolvedValue({});
    renderList("upcoming", true);

    fireEvent.click(screen.getByRole("button", { name: "Delete pool" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm" }));

    expect(await screen.findByText("Pool deleted")).toBeInTheDocument();
    expect(apiRequestMock).toHaveBeenCalledWith("/pools/p1", { method: "DELETE" });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("shows the error and does not refresh when the delete fails", async () => {
    apiRequestMock.mockRejectedValue(new Error("pool has bouts"));
    renderList("upcoming", true);

    fireEvent.click(screen.getByRole("button", { name: "Delete pool" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm" }));

    expect(await screen.findByText("pool has bouts")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});
