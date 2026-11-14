import { fireEvent, render, screen } from "@testing-library/react";

import { Toaster } from "@/components/primitives/toast";
import { apiRequest } from "@/services/api-request";

import { EndPoolStageButton } from "./end-pool-stage-button";

const refresh = jest.fn();
const push = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push }) }));
jest.mock("../../../services/api-request", () => ({ apiRequest: jest.fn() }));

const apiRequestMock = jest.mocked(apiRequest);

async function clickEnd(redirectTo?: string) {
  render(
    <Toaster>
      <EndPoolStageButton poolStageId="ps 1" redirectTo={redirectTo} />
    </Toaster>,
  );
  fireEvent.click(screen.getByRole("button", { name: "End pool stage" }));
}

describe("EndPoolStageButton", () => {
  beforeEach(() => {
    refresh.mockClear();
    push.mockClear();
    apiRequestMock.mockReset();
  });

  const cases = [
    {
      name: "confirms and refreshes on success",
      result: () => Promise.resolve({}),
      redirectTo: undefined,
      message: "Pool stage ended",
      refreshes: 1,
      pushes: [],
    },
    {
      name: "confirms and navigates on success when given a destination",
      result: () => Promise.resolve({}),
      redirectTo: "/admin/tournaments/t-1/events/e-1",
      message: "Pool stage ended",
      refreshes: 0,
      pushes: [["/admin/tournaments/t-1/events/e-1"]],
    },
    {
      name: "shows the error and stays put on failure",
      result: () => Promise.reject(new Error("every pool must end before the pool stage can end")),
      redirectTo: "/admin/tournaments/t-1/events/e-1",
      message: "every pool must end before the pool stage can end",
      refreshes: 0,
      pushes: [],
    },
  ];

  it.each(cases)("$name", async ({ result, redirectTo, message, refreshes, pushes }) => {
    apiRequestMock.mockImplementation(result);

    await clickEnd(redirectTo);

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(refreshes);
    expect(push.mock.calls).toEqual(pushes);
  });

  it("posts to the stage's end endpoint", async () => {
    apiRequestMock.mockResolvedValue({});

    await clickEnd();

    expect(apiRequestMock).toHaveBeenCalledWith("/pool-stages/ps%201/end", { method: "POST" });
  });
});
