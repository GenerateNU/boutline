import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { Toaster } from "@/components/primitives/toast";
import type { TournamentEvent } from "@/features/event/types/event";
import { ApiError, apiRequest } from "@/services/api-request";

import { AddRefereeDialog } from "./add-referee-dialog";

const refresh = jest.fn();
const onOpenChange = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
jest.mock("../../../../../../services/api-request", () => ({
  ...jest.requireActual("../../../../../../services/api-request"),
  apiRequest: jest.fn(),
}));

const apiRequestMock = jest.mocked(apiRequest);

const USERS = {
  data: [
    {
      id: "u-1",
      email: "ana@example.com",
      firstName: "Ana",
      lastName: "Diaz",
      createdAt: "",
      updatedAt: "",
    },
  ],
  total: 1,
  limit: 10,
  offset: 0,
};

const POOLS = { data: [{ id: "p-2", number: 2 }], total: 1, limit: 100, offset: 0 };

const EVENTS = [{ id: "e-1", name: "Mixed Épée" }] as TournamentEvent[];

const DUPLICATE = new ApiError("This user is already on the tournament's staff", 409);

async function pickUser() {
  fireEvent.change(screen.getByRole("searchbox", { name: "Referee" }), {
    target: { value: "ana" },
  });
  fireEvent.click(await screen.findByText("Ana Diaz · ana@example.com"));
}

// Opening a Radix Select inside the modal is very slow in jsdom, so this picks
// through the native <select> Radix keeps in sync for forms. SelectField's own
// tests cover opening the list.
async function choose(name: string, value: string) {
  // Radix remounts the native select when its options change, so query it afresh.
  const option = await waitFor(() => {
    const found = document.querySelector(`select[name="${name}"] option[value="${value}"]`);
    expect(found).not.toBeNull();
    return found!;
  });
  fireEvent.change(option.parentElement!, { target: { value } });
}

async function submit() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Add Referee" }));
  });
}

function mockApi(staffError?: Error) {
  apiRequestMock.mockImplementation(async (path) => {
    if (path.startsWith("/users")) {
      return USERS;
    }
    if (path.startsWith("/pool-sheets")) {
      return POOLS;
    }
    if (path.endsWith("/users") && staffError) {
      throw staffError;
    }
    return undefined;
  });
}

function renderDialog() {
  render(
    <Toaster>
      <AddRefereeDialog
        tournamentId="t-1"
        events={EVENTS}
        open
        onOpenChange={onOpenChange}
        returnFocusTo={{ current: null }}
      />
    </Toaster>,
  );
}

describe("AddRefereeDialog", () => {
  beforeEach(() => {
    refresh.mockClear();
    onOpenChange.mockClear();
    apiRequestMock.mockReset();
  });

  it("keeps Add Referee disabled until a user is picked", async () => {
    mockApi();
    renderDialog();
    const add = screen.getByRole("button", { name: "Add Referee" });
    expect(add).toBeDisabled();

    await pickUser();

    expect(add).toBeEnabled();
  });

  it("adds the picked user without a pool", async () => {
    mockApi();
    renderDialog();
    await pickUser();

    await submit();

    expect(await screen.findByText("Added Ana Diaz as a referee")).toBeInTheDocument();
    expect(apiRequestMock).toHaveBeenLastCalledWith(
      "/tournaments/t-1/users",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ user_id: "u-1", role: "referee" }),
      }),
    );
    expect(refresh).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it.each([
    { name: "a new referee", staffError: undefined },
    { name: "someone already on the staff", staffError: DUPLICATE },
  ])("assigns $name to the chosen pool", async ({ staffError }) => {
    mockApi(staffError);
    renderDialog();
    await pickUser();
    await choose("event", "e-1");
    await choose("pool", "p-2");

    await submit();

    expect(
      await screen.findByText("Added Ana Diaz as the referee for Pool 2"),
    ).toBeInTheDocument();
    expect(apiRequestMock).toHaveBeenLastCalledWith(
      "/pools/p-2",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ referee_id: "u-1" }) }),
    );
  });

  it.each([
    { name: "the user is already on the staff", error: DUPLICATE },
    { name: "the request fails", error: new ApiError("Request failed with status 500", 500) },
  ])("shows the message when $name and no pool is chosen", async ({ error }) => {
    mockApi(error);
    renderDialog();
    await pickUser();

    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent(error.message);
  });
});
