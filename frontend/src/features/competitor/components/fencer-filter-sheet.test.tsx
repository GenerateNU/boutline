import { act, fireEvent, render, screen } from "@testing-library/react";

import { FencerFilterSheet } from "@/features/competitor/components/fencer-filter-sheet";
import { apiRequest } from "@/services/api-request";

const replace = jest.fn();
let currentParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/fencers",
  useSearchParams: () => currentParams,
}));
jest.mock("../../../services/api-request", () => ({ apiRequest: jest.fn() }));

const apiRequestMock = jest.mocked(apiRequest);

function teams(...names: string[]) {
  return {
    data: names.map((name) => ({ name, competitorCount: 1 })),
    total: names.length,
    limit: 10,
    offset: 0,
  };
}

async function search(term: string) {
  const box = screen.getByRole("searchbox", { name: "Club" });
  fireEvent.focus(box);
  fireEvent.change(box, { target: { value: term } });
  await act(async () => {
    jest.advanceTimersByTime(300);
  });
}

async function openSheet() {
  render(<FencerFilterSheet tournamentId="t 1" />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Filter fencers" }));
  });
}

describe("FencerFilterSheet", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    replace.mockClear();
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue(teams("Boston Blade Club", "Salle Nord"));
    currentParams = new URLSearchParams();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows no club suggestions until typing", async () => {
    await openSheet();

    expect(apiRequestMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Salle Nord" })).not.toBeInTheDocument();
  });

  it("filters by a club found through search", async () => {
    await openSheet();
    apiRequestMock.mockResolvedValue(teams("Salle Nord"));

    await search("nord");
    fireEvent.click(screen.getByRole("button", { name: "Salle Nord" }));
    fireEvent.click(screen.getByRole("button", { name: "Show Fencers" }));

    expect(apiRequestMock).toHaveBeenLastCalledWith("/tournaments/t%201/teams?limit=10&q=nord");
    expect(replace).toHaveBeenLastCalledWith("/fencers?team=Salle+Nord", { scroll: false });
  });

  it("shows the picked club as a tag and drops it after Clear All", async () => {
    currentParams = new URLSearchParams("team=Salle+Nord&q=wang");
    await openSheet();
    expect(screen.getByRole("button", { name: "Remove Salle Nord" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear All" }));
    expect(screen.queryByText("Salle Nord")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show Fencers" }));

    expect(replace).toHaveBeenLastCalledWith("/fencers?q=wang", { scroll: false });
  });

  it("picking a club adds a tag and clears the search", async () => {
    await openSheet();
    await search("b");

    fireEvent.click(screen.getByRole("button", { name: "Boston Blade Club" }));

    expect(screen.getByRole("button", { name: "Remove Boston Blade Club" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Club" })).toHaveValue("");
  });

  it.each([
    {
      name: "no clubs",
      setup: () => apiRequestMock.mockResolvedValue(teams()),
      want: "No clubs match.",
    },
    {
      name: "a failed request",
      setup: () => apiRequestMock.mockRejectedValue(new Error("boom")),
      want: "Couldn’t load clubs.",
    },
  ])("shows a message for $name", async ({ setup, want }) => {
    setup();
    await openSheet();
    await search("x");

    expect(screen.getByText(want)).toBeInTheDocument();
  });
});
