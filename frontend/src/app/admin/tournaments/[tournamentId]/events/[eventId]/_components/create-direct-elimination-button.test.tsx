import { fireEvent, render, screen } from "@testing-library/react";

import { Toaster } from "@/components/primitives/toast";
import { apiRequest } from "@/services/api-request";

import { CreateDirectEliminationButton } from "./create-direct-elimination-button";

const refresh = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
jest.mock("../../../../../../../services/api-request", () => ({ apiRequest: jest.fn() }));

const apiRequestMock = jest.mocked(apiRequest);

async function clickCreate() {
  render(
    <Toaster>
      <CreateDirectEliminationButton eventId="e1" />
    </Toaster>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Create direct elimination" }));
}

describe("CreateDirectEliminationButton", () => {
  beforeEach(() => {
    refresh.mockClear();
    apiRequestMock.mockReset();
  });

  const cases = [
    {
      name: "confirms and refreshes on success",
      result: () => Promise.resolve({}),
      message: "Direct elimination created",
      refreshes: 1,
    },
    {
      name: "shows the error and does not refresh on failure",
      result: () => Promise.reject(new Error("event not found")),
      message: "event not found",
      refreshes: 0,
    },
  ];

  it.each(cases)("$name", async ({ result, message, refreshes }) => {
    apiRequestMock.mockImplementation(result);

    await clickCreate();

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(refreshes);
  });

  it("posts the event id", async () => {
    apiRequestMock.mockResolvedValue({});

    await clickCreate();

    expect(apiRequestMock).toHaveBeenCalledWith("/direct-eliminations", {
      method: "POST",
      body: JSON.stringify({ event_id: "e1" }),
    });
  });
});
