import { act, fireEvent, render, screen } from "@testing-library/react";

import { Toaster } from "@/components/primitives/toast";
import type { RefereeResponse } from "@/features/referee/types/referee";
import { apiRequest } from "@/services/api-request";

import { RefereeRoster } from "./referee-roster";

const refresh = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
jest.mock("../../../../../../../services/api-request", () => ({ apiRequest: jest.fn() }));

const apiRequestMock = jest.mocked(apiRequest);

const REFEREES: RefereeResponse[] = [
  {
    user_id: "u-1",
    tournament_id: "t-1",
    role: "referee",
    first_name: "Ana",
    last_name: "Diaz",
    occupied: true,
    pool_number: 1,
    created_at: "",
    updated_at: "",
  },
  {
    user_id: "u-2",
    tournament_id: "t-1",
    role: "referee",
    first_name: "Yan",
    last_name: "Wang",
    occupied: false,
    pool_number: null,
    created_at: "",
    updated_at: "",
  },
];

function renderRoster(referees: RefereeResponse[], canManage = true) {
  render(
    <Toaster>
      <RefereeRoster tournamentId="t-1" referees={referees} events={[]} canManage={canManage} emptyMessage="No referees yet." />
    </Toaster>,
  );
}

function clickRemove(name: string) {
  fireEvent.click(screen.getByRole("button", { name: `Remove ${name}` }));
}

async function confirmRemove() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
  });
}

describe("RefereeRoster", () => {
  beforeEach(() => {
    refresh.mockClear();
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue(undefined);
  });

  it.each([
    {
      name: "rows with their names, status and pool",
      referees: REFEREES,
      texts: ["Ana Diaz", "Occupied", "Pool 1", "Yan Wang", "Available"],
    },
    { name: "the empty message", referees: [], texts: ["No referees yet."] },
  ])("renders $name", ({ referees, texts }) => {
    renderRoster(referees);

    texts.forEach((text) => expect(screen.getByText(text)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Add Referees" })).toBeInTheDocument();
  });

  it("shows a referee the roster without Add or Remove", () => {
    renderRoster(REFEREES, false);

    expect(screen.getByText("Ana Diaz")).toBeInTheDocument();
    expect(screen.getByText("Yan Wang")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("asks before removing, and Cancel keeps the referee", () => {
    renderRoster(REFEREES);

    clickRemove("Ana Diaz");

    expect(screen.getByRole("dialog", { name: "Remove referee?" })).toHaveTextContent(
      "Ana Diaz will no longer be a referee for this tournament.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(apiRequestMock).not.toHaveBeenCalled();
  });

  it.each([
    { name: "removes the referee once confirmed", error: undefined, toast: "Removed Ana Diaz" },
    { name: "shows the error when the remove fails", error: new Error("boom"), toast: "boom" },
  ])("$name", async ({ error, toast }) => {
    if (error) {
      apiRequestMock.mockRejectedValue(error);
    }
    renderRoster(REFEREES);

    clickRemove("Ana Diaz");
    await confirmRemove();

    expect(apiRequestMock).toHaveBeenCalledWith("/tournaments/t-1/users/u-1", { method: "DELETE" });
    expect(screen.getByText(toast)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
