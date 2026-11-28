import { act, fireEvent, render, screen } from "@testing-library/react";

import { Toaster } from "@/components/primitives/toast";
import { apiRequest } from "@/services/api-request";
import type { Competitor } from "@/types/competitor";

import { EditFencerDialog } from "./edit-fencer-dialog";

const refresh = jest.fn();
const onOpenChange = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
jest.mock("../../../../../../../../../services/api-request", () => ({ apiRequest: jest.fn() }));

const apiRequestMock = jest.mocked(apiRequest);

const YAN: Competitor = {
  id: "c-1",
  eventId: "e1",
  tournamentId: "t1",
  firstName: "Yan",
  lastName: "Wang",
  rating: "A",
  ratingYear: 26,
  team: "Boston Blade Club",
  checkedInAt: null,
};

function renderDialog(competitor: Competitor | null = YAN) {
  render(
    <Toaster>
      <EditFencerDialog competitor={competitor} onOpenChange={onOpenChange} />
    </Toaster>,
  );
}

async function confirm() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Confirm edits" }));
  });
}

describe("EditFencerDialog", () => {
  beforeEach(() => {
    refresh.mockClear();
    onOpenChange.mockClear();
    apiRequestMock.mockReset();
  });

  it("is closed without a competitor", () => {
    renderDialog(null);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("prefills the fencer's details", () => {
    renderDialog();

    expect(screen.getByLabelText(/^First name/)).toHaveValue("Yan");
    expect(screen.getByLabelText(/^Last name/)).toHaveValue("Wang");
    expect(screen.getByLabelText("Club")).toHaveValue("Boston Blade Club");
    expect(screen.getByRole("radio", { name: "Absent" })).toBeChecked();
  });

  it("patches the edits, leaving check-in alone when unchanged, then refreshes and closes", async () => {
    apiRequestMock.mockResolvedValue({});
    renderDialog();
    fireEvent.change(screen.getByLabelText("Club"), { target: { value: "Salle Pau" } });

    await confirm();

    expect(await screen.findByText("Fencer updated")).toBeInTheDocument();
    expect(apiRequestMock).toHaveBeenCalledWith("/competitors/c-1", {
      method: "PATCH",
      body: JSON.stringify({
        firstName: "Yan",
        lastName: "Wang",
        team: "Salle Pau",
        primaryClub: "Salle Pau",
        rating: "A",
      }),
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("checks the fencer in when marked present", async () => {
    apiRequestMock.mockResolvedValue({});
    renderDialog();
    fireEvent.click(screen.getByRole("radio", { name: "Present" }));

    await confirm();

    expect(JSON.parse(apiRequestMock.mock.calls[0][1]!.body as string)).toMatchObject({ checkedIn: true });
  });

  it("shows the error and stays open when the request fails", async () => {
    apiRequestMock.mockRejectedValue(new Error("rating is invalid"));
    renderDialog();

    await confirm();

    expect(await screen.findByText("rating is invalid")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("closes from Cancel without saving", () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(apiRequestMock).not.toHaveBeenCalled();
  });
});
