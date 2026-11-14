import { fireEvent, render, screen } from "@testing-library/react";

import { Toaster } from "@/components/primitives/toast";
import { apiRequest } from "@/services/api-request";

import { EndPoolStageButton } from "./end-pool-stage-button";

const refresh = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
jest.mock("../../../../../../../services/api-request", () => ({ apiRequest: jest.fn() }));

const apiRequestMock = jest.mocked(apiRequest);

async function clickEnd() {
  render(
    <Toaster>
      <EndPoolStageButton poolStageId="ps 1" />
    </Toaster>,
  );
  fireEvent.click(screen.getByRole("button", { name: "End pool stage" }));
}

describe("EndPoolStageButton", () => {
  beforeEach(() => {
    refresh.mockClear();
    apiRequestMock.mockReset();
  });

  const cases = [
    {
      name: "confirms and refreshes on success",
      result: () => Promise.resolve({}),
      message: "Pool stage ended",
      refreshes: 1,
    },
    {
      name: "shows the error and does not refresh on failure",
      result: () => Promise.reject(new Error("every pool must end before the pool stage can end")),
      message: "every pool must end before the pool stage can end",
      refreshes: 0,
    },
  ];

  it.each(cases)("$name", async ({ result, message, refreshes }) => {
    apiRequestMock.mockImplementation(result);

    await clickEnd();

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(refreshes);
  });

  it("posts to the stage's end endpoint", async () => {
    apiRequestMock.mockResolvedValue({});

    await clickEnd();

    expect(apiRequestMock).toHaveBeenCalledWith("/pool-stages/ps%201/end", { method: "POST" });
  });
});
