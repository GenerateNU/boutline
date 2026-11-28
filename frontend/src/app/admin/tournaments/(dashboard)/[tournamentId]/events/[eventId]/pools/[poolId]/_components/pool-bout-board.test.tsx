import { fireEvent, render, screen, within } from "@testing-library/react";

import { Toaster } from "@/components/primitives/toast";
import type { PoolBoard, PoolBout, PoolFencer } from "@/features/pool/types/pool-board";
import { apiRequest } from "@/services/api-request";

import { PoolBoutBoard } from "./pool-bout-board";

const refresh = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
jest.mock("../../../../../../../../../../services/api-request", () => ({ apiRequest: jest.fn() }));

const apiRequestMock = jest.mocked(apiRequest);

function fencer(id: string, position: number, first: string, last: string): PoolFencer {
  return {
    competitor_id: id,
    position,
    first_name: first,
    last_name: last,
    team: "Club",
    standing: { place: 1, victories: 0, matches: 0, victory_ratio: 0, touches_scored: 0, touches_received: 0, indicator: 0 },
  };
}

function bout(id: string, slot: number, status: PoolBout["status"], one: string, two: string): PoolBout {
  return {
    id,
    slot,
    status,
    competitor_1_id: one,
    competitor_2_id: two,
    competitor_1_score: 0,
    competitor_2_score: 0,
    winner_id: null,
    location: null,
    start_time: null,
  };
}

const POOL = {
  id: "p1",
  pool_stage_id: "s1",
  number: 1,
  strip: "Strip 3",
  status: "active",
  fencers: [fencer("a", 1, "Ada", "Quinn"), fencer("b", 2, "Bo", "Rivera"), fencer("c", 3, "Cy", "Stone")],
  bouts: [bout("u", 1, "upcoming", "a", "b"), bout("l", 2, "active", "b", "c"), bout("e", 3, "ended", "a", "c")],
} as PoolBoard;

const REFEREE_BASE = "/tournaments/t1/events/e1/bout";

function renderBoard(props: { editing?: boolean; canManage?: boolean } = {}) {
  render(
    <Toaster>
      <PoolBoutBoard
        pool={POOL}
        editing={props.editing ?? false}
        canManage={props.canManage ?? true}
        editHref="/edit"
        exitHref="/exit"
        refereeBasePath={REFEREE_BASE}
      />
    </Toaster>,
  );
}

function card(boutNumber: number) {
  return screen.getAllByRole("region", { name: "Pool bout" })[boutNumber - 1];
}

describe("PoolBoutBoard", () => {
  beforeEach(() => {
    refresh.mockClear();
    apiRequestMock.mockReset();
  });

  const mainButtons = [
    { name: "upcoming starts the match", index: 1, label: "Start Match", href: `${REFEREE_BASE}/u/referee` },
    { name: "active continues the match", index: 2, label: "Continue Match", href: `${REFEREE_BASE}/l/referee` },
  ];

  it.each(mainButtons)("$name", ({ index, label, href }) => {
    renderBoard();

    expect(within(card(index)).getByRole("link", { name: label })).toHaveAttribute("href", href);
  });

  it("opens the audit log for an ended bout", () => {
    apiRequestMock.mockReturnValue(new Promise(() => {}));
    renderBoard();

    fireEvent.click(within(card(3)).getByRole("button", { name: "View Audit Log" }));

    expect(screen.getByRole("dialog", { name: "Audit Log" })).toBeInTheDocument();
  });

  const editControls = [
    { name: "upcoming", index: 1, enabled: ["Delete", "Edit Info"] },
    { name: "active", index: 2, enabled: [] },
    { name: "ended", index: 3, enabled: ["Delete"] },
  ];

  it.each(editControls)("edit mode enables $enabled on an $name bout", ({ index, enabled }) => {
    renderBoard({ editing: true });

    for (const label of ["Delete", "Edit Info"]) {
      expect(within(card(index)).getByRole("button", { name: label }).hasAttribute("disabled")).toBe(
        !enabled.includes(label),
      );
    }
  });

  const modeLinks = [
    { name: "offers edit mode", editing: false, canManage: true, label: "Edit Mode", href: "/edit" },
    { name: "offers exit while editing", editing: true, canManage: true, label: "Exit Edit Mode", href: "/exit" },
  ];

  it.each(modeLinks)("$name", ({ editing, canManage, label, href }) => {
    renderBoard({ editing, canManage });

    expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href);
  });

  it("hides edit mode from non-admins", () => {
    renderBoard({ canManage: false });

    expect(screen.queryByRole("link", { name: "Edit Mode" })).not.toBeInTheDocument();
  });

  it("narrows bouts by search and explains an empty result", () => {
    renderBoard();

    fireEvent.change(screen.getByRole("textbox", { name: "Search fencers" }), { target: { value: "stone" } });
    expect(screen.getAllByRole("region", { name: "Pool bout" })).toHaveLength(2);

    fireEvent.change(screen.getByRole("textbox", { name: "Search fencers" }), { target: { value: "zed" } });
    expect(screen.getByText("No bouts match your search or filters.")).toBeInTheDocument();
  });

  it("sends DELETE after confirming and refreshes", async () => {
    apiRequestMock.mockResolvedValue(undefined);
    renderBoard({ editing: true });

    fireEvent.click(within(card(1)).getByRole("button", { name: "Delete" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Delete Bout?" })).getByRole("button", { name: "Confirm" }));

    expect(await screen.findByText("Bout deleted")).toBeInTheDocument();
    expect(apiRequestMock).toHaveBeenCalledWith("/bouts/u", { method: "DELETE" });
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
