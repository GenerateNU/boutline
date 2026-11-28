import { fireEvent, render, screen } from "@testing-library/react";

import { Toaster } from "@/components/primitives/toast";
import type { TournamentEvent } from "@/features/event/types/event";
import { apiRequest } from "@/services/api-request";

import { EventSettingsForm } from "./event-settings-form";

const refresh = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
jest.mock("../../../../../../../../../services/api-request", () => ({ apiRequest: jest.fn() }));

const apiRequestMock = jest.mocked(apiRequest);

const EVENT: TournamentEvent = {
  id: "e1",
  tournament_id: "t1",
  format: "pool_then_direct_elimination",
  name: "Div I-A Junior Mixed Foil",
  type: "individual",
  weapon: "foil",
  gender: "other",
  age_category: "junior",
  rating_limit: "c_and_under",
  qualifier: false,
  status: "upcoming",
  start_time: "2026-10-19T08:00:00.000Z",
  started_at: null,
  completed_at: null,
  created_at: "2026-10-01T00:00:00.000Z",
  updated_at: "2026-10-01T00:00:00.000Z",
};

function renderForm(event: Partial<TournamentEvent> = {}, canManage = true) {
  render(
    <Toaster>
      <EventSettingsForm event={{ ...EVENT, ...event }} canManage={canManage} />
    </Toaster>,
  );
}

function pressed(name: string) {
  return screen.getByRole("button", { name }).getAttribute("aria-pressed");
}

describe("EventSettingsForm", () => {
  beforeEach(() => {
    refresh.mockClear();
    apiRequestMock.mockReset();
  });

  it("shows the event's current values, read-only", () => {
    renderForm();

    expect(screen.getByRole("combobox", { name: "Type of Event" })).toHaveTextContent("Individual");
    expect(screen.getByRole("combobox", { name: "Rating Level" })).toHaveTextContent("Division II (C & under)");
    expect(screen.getByRole("combobox", { name: "Time" })).toHaveTextContent("8:00 AM");
    expect(pressed("Foil")).toBe("true");
    expect(pressed("Mixed")).toBe("true");
    expect(screen.getByRole("button", { name: "Sabre" })).toBeDisabled();
  });

  it.each([
    { name: "an admin can edit an upcoming event", status: "upcoming", canManage: true, edit: "enabled", note: false },
    { name: "an admin can't edit a started event", status: "active", canManage: true, edit: "disabled", note: true },
    { name: "an admin can't edit an ended event", status: "ended", canManage: true, edit: "disabled", note: true },
    { name: "a referee gets no Edit button", status: "upcoming", canManage: false, edit: "absent", note: false },
  ] as const)("$name", ({ status, canManage, edit, note }) => {
    renderForm({ status }, canManage);

    const button = screen.queryByRole("button", { name: "Edit" });
    if (edit === "absent") {
      expect(button).not.toBeInTheDocument();
    } else {
      expect(button).toHaveProperty("disabled", edit === "disabled");
    }
    expect(screen.queryByText("Events can only be edited before they start.") !== null).toBe(note);
  });

  it("saves the edited event and refreshes", async () => {
    apiRequestMock.mockResolvedValue({});
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Sabre" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Event updated")).toBeInTheDocument();
    expect(apiRequestMock).toHaveBeenCalledWith("/events/e1", {
      method: "PATCH",
      body: JSON.stringify({
        start_time: "2026-10-19T08:00:00.000Z",
        type: "individual",
        weapon: "sabre",
        gender: "other",
        age_category: "junior",
        rating_limit: "c_and_under",
      }),
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("no longer shows a Qualifier setting", () => {
    renderForm();

    expect(screen.queryByText("Qualifier")).not.toBeInTheDocument();
  });

  it("cancelling restores the saved values without a request", () => {
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Sabre" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel editing" }));

    expect(pressed("Foil")).toBe("true");
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(apiRequestMock).not.toHaveBeenCalled();
  });

  it("shows the error and stays in edit mode when saving fails", async () => {
    apiRequestMock.mockRejectedValue(new Error("only an upcoming event can be edited"));
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("only an upcoming event can be edited")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});
