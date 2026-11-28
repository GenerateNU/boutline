import { fireEvent, render, screen } from "@testing-library/react";

import { Toaster } from "@/components/primitives/toast";
import type { PoolBoard, PoolBout, PoolFencer } from "@/features/pool/types/pool-board";
import { apiRequest } from "@/services/api-request";

import { EditBoutDialog } from "./edit-bout-dialog";

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

const POOL = {
  fencers: [fencer("a", 1, "Ada", "Quinn"), fencer("b", 2, "Bo", "Rivera"), fencer("c", 3, "Cy", "Stone")],
} as PoolBoard;

const BOUT = { id: "b1", competitor_1_id: "a", competitor_2_id: "b" } as PoolBout;

function renderDialog() {
  const { baseElement } = render(
    <Toaster>
      <EditBoutDialog bout={BOUT} pool={POOL} onOpenChange={jest.fn()} />
    </Toaster>,
  );
  // Radix mirrors each Select into a hidden native select, the only one jsdom can drive.
  const [player1, player2] = Array.from(baseElement.querySelectorAll("select"));
  return { player1, player2 };
}

describe("EditBoutDialog", () => {
  beforeEach(() => {
    refresh.mockClear();
    apiRequestMock.mockReset();
  });

  it("patches the picked fencers and refreshes", async () => {
    apiRequestMock.mockResolvedValue({});
    const { player2 } = renderDialog();

    fireEvent.change(player2, { target: { value: "c" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm edits" }));

    expect(await screen.findByText("Bout updated")).toBeInTheDocument();
    expect(apiRequestMock).toHaveBeenCalledWith("/bouts/b1", {
      method: "PATCH",
      body: JSON.stringify({ competitor_1_id: "a", competitor_2_id: "c" }),
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("disables Confirm when both players are the same fencer", () => {
    const { player2 } = renderDialog();
    expect(screen.getByRole("button", { name: "Confirm edits" })).toBeEnabled();

    fireEvent.change(player2, { target: { value: "a" } });

    expect(screen.getByRole("button", { name: "Confirm edits" })).toBeDisabled();
  });

  it("shows the error and does not refresh on failure", async () => {
    apiRequestMock.mockRejectedValue(new Error("bout already started"));
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Confirm edits" }));

    expect(await screen.findByText("bout already started")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});
