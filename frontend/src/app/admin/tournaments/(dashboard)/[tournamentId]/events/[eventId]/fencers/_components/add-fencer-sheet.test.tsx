import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { Toaster } from "@/components/primitives/toast";
import { apiRequest } from "@/services/api-request";

import { AddFencerSheet } from "./add-fencer-sheet";

const refresh = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
jest.mock("../../../../../../../../../services/api-request", () => ({ apiRequest: jest.fn() }));

const apiRequestMock = jest.mocked(apiRequest);

// Opening a Radix Select in jsdom is slow, so this picks through its native <select>.
async function choose(name: string, value: string) {
  const option = await waitFor(() => {
    const found = document.querySelector(`select[name="${name}"] option[value="${value}"]`);
    expect(found).not.toBeNull();
    return found!;
  });
  fireEvent.change(option.parentElement!, { target: { value } });
}

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(new RegExp(`^${label}`)), { target: { value } });
}

async function fillRequired() {
  type("First name", "  Yan ");
  type("Last name", "Wang");
  await choose("gender", "F");
  type("Birth date", "2000-05-17");
  type("Division", "Div 1");
}

async function openSheet() {
  render(
    <Toaster>
      <AddFencerSheet eventId="e1" />
    </Toaster>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Add Fencers" }));
  await screen.findByRole("dialog");
}

describe("AddFencerSheet", () => {
  beforeEach(() => {
    refresh.mockClear();
    apiRequestMock.mockReset();
  });

  it("keeps Add Fencer disabled until every required field is filled", async () => {
    await openSheet();
    const add = screen.getByRole("button", { name: "Add Fencer" });
    expect(add).toBeDisabled();

    await fillRequired();

    expect(add).toBeEnabled();
  });

  it("posts the fencer, then refreshes and closes", async () => {
    apiRequestMock.mockResolvedValue({});
    await openSheet();
    await fillRequired();
    type("Club", "Boston Blade Club");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Add Fencer" }));
    });

    expect(await screen.findByText("Fencer added")).toBeInTheDocument();
    expect(apiRequestMock).toHaveBeenCalledWith("/competitors", {
      method: "POST",
      body: JSON.stringify({
        eventId: "e1",
        firstName: "Yan",
        lastName: "Wang",
        team: "Boston Blade Club",
        primaryClub: "Boston Blade Club",
        gender: "F",
        birthdate: "2000-05-17",
        division: "Div 1",
        rating: "U",
      }),
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("shows the error and does not refresh when the request fails", async () => {
    apiRequestMock.mockRejectedValue(new Error("division is invalid"));
    await openSheet();
    await fillRequired();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Add Fencer" }));
    });

    expect(await screen.findByText("division is invalid")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});
