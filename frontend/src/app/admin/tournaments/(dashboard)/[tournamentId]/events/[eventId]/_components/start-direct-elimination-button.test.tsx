import { fireEvent, render, screen } from "@testing-library/react";

import { Toaster } from "@/components/primitives/toast";
import { apiRequest } from "@/services/api-request";

import { StartDirectEliminationButton } from "./start-direct-elimination-button";

const refresh = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
jest.mock("../../../../../../../../services/api-request", () => ({ apiRequest: jest.fn() }));

const apiRequestMock = jest.mocked(apiRequest);

async function clickStart(directEliminationId = "de1") {
  render(
    <Toaster>
      <StartDirectEliminationButton directEliminationId={directEliminationId} />
    </Toaster>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Start direct elimination" }));
}

describe("StartDirectEliminationButton", () => {
  beforeEach(() => {
    refresh.mockClear();
    apiRequestMock.mockReset();
  });

  const cases = [
    {
      name: "confirms and refreshes on success",
      result: () => Promise.resolve({}),
      message: "Direct elimination started",
      refreshes: 1,
    },
    {
      name: "shows the error and does not refresh on failure",
      result: () =>
        Promise.reject(new Error("the tableau must be drawn before the direct elimination can start")),
      message: "the tableau must be drawn before the direct elimination can start",
      refreshes: 0,
    },
  ];

  it.each(cases)("$name", async ({ result, message, refreshes }) => {
    apiRequestMock.mockImplementation(result);

    await clickStart();

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(refreshes);
  });

  it("posts to the encoded start path", async () => {
    apiRequestMock.mockResolvedValue({});

    await clickStart("de 1");

    expect(apiRequestMock).toHaveBeenCalledWith("/direct-eliminations/de%201/start", {
      method: "POST",
    });
  });
});
