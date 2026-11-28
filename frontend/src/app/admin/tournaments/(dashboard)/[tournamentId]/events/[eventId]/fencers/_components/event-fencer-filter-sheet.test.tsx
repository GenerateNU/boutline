import { act, fireEvent, render, screen } from "@testing-library/react";

import { EventFencerFilterSheet } from "./event-fencer-filter-sheet";

const replace = jest.fn();
let currentParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/fencers",
  useSearchParams: () => currentParams,
}));
jest.mock("../../../../../../../../../services/api-request", () => ({ apiRequest: jest.fn() }));

async function openSheet() {
  render(<EventFencerFilterSheet tournamentId="t1" />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Filter fencers" }));
  });
}

function show() {
  fireEvent.click(screen.getByRole("button", { name: "Show Fencers" }));
}

describe("EventFencerFilterSheet", () => {
  beforeEach(() => {
    replace.mockClear();
    currentParams = new URLSearchParams();
  });

  it.each([
    { name: "present fencers", pick: "Present", want: "/fencers?checkedIn=true" },
    { name: "absent fencers", pick: "Absent", want: "/fencers?checkedIn=false" },
  ])("filters to $name", async ({ pick, want }) => {
    await openSheet();
    fireEvent.click(screen.getByRole("radio", { name: pick }));
    show();

    expect(replace).toHaveBeenCalledWith(want, { scroll: false });
  });

  it("searches by fencer name", async () => {
    await openSheet();
    fireEvent.change(screen.getByLabelText("Fencer"), { target: { value: " Ada " } });
    show();

    expect(replace).toHaveBeenCalledWith("/fencers?q=Ada", { scroll: false });
  });

  it("starts from the URL and Clear All drops every filter", async () => {
    currentParams = new URLSearchParams("checkedIn=true&rating=A&q=Ada");
    await openSheet();

    expect(screen.getByRole("radio", { name: "Present" })).toBeChecked();
    expect(screen.getByLabelText("Fencer")).toHaveValue("Ada");

    fireEvent.click(screen.getByRole("button", { name: "Clear All" }));
    show();

    expect(replace).toHaveBeenCalledWith("/fencers", { scroll: false });
  });
});
