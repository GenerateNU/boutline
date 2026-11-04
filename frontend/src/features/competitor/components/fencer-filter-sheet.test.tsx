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

  it("filters by a club found through search", async () => {
    await openSheet();
    apiRequestMock.mockResolvedValue(teams("Salle Nord"));

    fireEvent.change(screen.getByRole("searchbox", { name: "Club" }), {
      target: { value: "nord" },
    });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    fireEvent.click(screen.getByRole("button", { name: "Salle Nord" }));
    fireEvent.click(screen.getByRole("button", { name: "Show fencers" }));

    expect(apiRequestMock).toHaveBeenLastCalledWith("/tournaments/t%201/teams?limit=10&q=nord");
    expect(replace).toHaveBeenLastCalledWith("/fencers?team=Salle+Nord", { scroll: false });
  });

  it("drops the club from the URL after Clear all", async () => {
    currentParams = new URLSearchParams("team=Salle+Nord&q=wang");
    await openSheet();
    expect(screen.getByRole("button", { name: "Salle Nord" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(screen.getByRole("button", { name: "Salle Nord" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    fireEvent.click(screen.getByRole("button", { name: "Show fencers" }));

    expect(replace).toHaveBeenLastCalledWith("/fencers?q=wang", { scroll: false });
  });

  it("deselects a selected club when clicked again", async () => {
    await openSheet();
    const club = screen.getByRole("button", { name: "Boston Blade Club" });

    fireEvent.click(club);
    expect(club).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(club);

    expect(club).toHaveAttribute("aria-pressed", "false");
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

    expect(screen.getByText(want)).toBeInTheDocument();
  });
});
