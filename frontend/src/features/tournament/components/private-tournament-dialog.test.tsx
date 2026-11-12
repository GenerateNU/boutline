import { act, fireEvent, render, screen } from "@testing-library/react";

import { PrivateTournamentDialog } from "@/features/tournament/components/private-tournament-dialog";
import { apiRequest } from "@/services/api-request";

const push = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
jest.mock("../../../services/api-request", () => ({ apiRequest: jest.fn() }));

const apiRequestMock = jest.mocked(apiRequest);

async function submit(code: string) {
  render(
    <PrivateTournamentDialog open onOpenChange={jest.fn()} returnFocusTo={{ current: null }} />,
  );
  fireEvent.change(screen.getByRole("textbox", { name: "Tournament code" }), {
    target: { value: code },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
  });
}

describe("PrivateTournamentDialog", () => {
  beforeEach(() => {
    push.mockClear();
    apiRequestMock.mockReset();
  });

  it("opens the tournament when the code is found", async () => {
    apiRequestMock.mockResolvedValue({ id: "t-1" } as never);

    await submit("ABC123");

    expect(apiRequestMock).toHaveBeenCalledWith(
      "/tournaments/code/ABC123",
      expect.anything(),
    );
    expect(push).toHaveBeenCalledWith("/tournaments/t-1");
  });

  it.each([
    { name: "an API error message", rejection: new Error("Code not found"), text: "Code not found" },
    { name: "a non-Error rejection", rejection: "boom", text: "Tournament not found" },
  ])("shows the error and marks the field invalid on $name", async ({ rejection, text }) => {
    apiRequestMock.mockRejectedValue(rejection);

    await submit("ZZZ999");

    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Tournament code" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(push).not.toHaveBeenCalled();
  });
});
