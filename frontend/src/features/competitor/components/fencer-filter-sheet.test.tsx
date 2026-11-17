import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

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

async function search(term: string, field = "Club") {
  const box = screen.getByRole("searchbox", { name: field });
  fireEvent.focus(box);
  fireEvent.change(box, { target: { value: term } });
  await act(async () => {
    jest.advanceTimersByTime(300);
  });
}

async function openSheet(scope: "tournament" | "event" = "tournament") {
  render(<FencerFilterSheet tournamentId="t 1" scope={scope} />);
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
    currentParams = new URLSearchParams("team=Salle+Nord&offset=20");
    await openSheet();
    expect(screen.getByRole("button", { name: "Remove Club: Salle Nord" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear All" }));
    expect(screen.queryByText("Salle Nord")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show Fencers" }));

    expect(replace).toHaveBeenLastCalledWith("/fencers", { scroll: false });
  });

  it("renders exactly one searchbox, labelled Club", async () => {
    await openSheet();

    expect(screen.getAllByRole("searchbox").map((box) => box.getAttribute("aria-label"))).toEqual([
      "Club",
    ]);
  });

  it("picking a club adds a tag and clears the search", async () => {
    await openSheet();
    await search("b");

    fireEvent.click(screen.getByRole("button", { name: "Boston Blade Club" }));

    expect(screen.getByRole("button", { name: "Remove Club: Boston Blade Club" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Club" })).toHaveValue("");
  });

  it("shows a spinner while a club search loads", async () => {
    apiRequestMock.mockReturnValue(new Promise(() => {}));
    await openSheet();
    await search("nord");

    expect(screen.getByRole("status")).toHaveTextContent("Loading");
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

  it("pressing Enter in Club commits the typed text, clears the box and keeps the sheet open", async () => {
    await openSheet();

    await search("bos", "Club");
    fireEvent.keyDown(screen.getByRole("searchbox", { name: "Club" }), { key: "Enter" });

    expect(screen.getByRole("searchbox", { name: "Club" })).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Boston Blade Club" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show Fencers" }));
    expect(replace).toHaveBeenLastCalledWith("/fencers?team=bos", { scroll: false });
  });

  it("applies typed Club text on Show Fencers without pressing Enter", async () => {
    await openSheet();

    await search("bos");
    fireEvent.click(screen.getByRole("button", { name: "Show Fencers" }));

    expect(replace).toHaveBeenLastCalledWith("/fencers?team=bos", { scroll: false });
  });

  async function chooseRating(value: string) {
    const option = await waitFor(() => {
      const found = document.querySelector(`select[name="rating"] option[value="${value}"]`);
      expect(found).not.toBeNull();
      return found!;
    });
    fireEvent.change(option.parentElement!, { target: { value } });
  }

  it("picking a rating and submitting sets ?rating=", async () => {
    await openSheet();

    await chooseRating("C");
    fireEvent.click(screen.getByRole("button", { name: "Show Fencers" }));

    expect(replace).toHaveBeenLastCalledWith("/fencers?rating=C", { scroll: false });
  });

  it("clicking a gender chip and submitting sets ?gender=", async () => {
    await openSheet();

    fireEvent.click(screen.getByRole("radio", { name: "Female" }));
    fireEvent.click(screen.getByRole("button", { name: "Show Fencers" }));

    expect(replace).toHaveBeenLastCalledWith("/fencers?gender=F", { scroll: false });
  });

  it("shows Rating: Unrated for the U rating", async () => {
    await openSheet();

    await chooseRating("U");

    expect(screen.getByText("Rating: Unrated")).toBeInTheDocument();
  });

  it("Clear All then Show Fencers clears club, rating and gender", async () => {
    currentParams = new URLSearchParams("team=Salle+Nord&rating=C&gender=F");
    await openSheet();

    fireEvent.click(screen.getByRole("button", { name: "Clear All" }));
    fireEvent.click(screen.getByRole("button", { name: "Show Fencers" }));

    expect(replace).toHaveBeenLastCalledWith("/fencers", { scroll: false });
  });

  it("picking a Weapon chip and submitting sets ?weapon=", async () => {
    await openSheet();

    fireEvent.click(screen.getByRole("radio", { name: "Foil" }));
    fireEvent.click(screen.getByRole("button", { name: "Show Fencers" }));

    expect(replace).toHaveBeenLastCalledWith("/fencers?weapon=foil", { scroll: false });
  });

  async function chooseAgeCategory(value: string) {
    const option = await waitFor(() => {
      const found = document.querySelector(`select[name="ageCategory"] option[value="${value}"]`);
      expect(found).not.toBeNull();
      return found!;
    });
    fireEvent.change(option.parentElement!, { target: { value } });
  }

  it("picking an Age Category and submitting sets ?ageCategory=", async () => {
    await openSheet();

    await chooseAgeCategory("y10");
    fireEvent.click(screen.getByRole("button", { name: "Show Fencers" }));

    expect(replace).toHaveBeenLastCalledWith("/fencers?ageCategory=y10", { scroll: false });
  });

  it("shows the picked weapon as a tag", async () => {
    await openSheet();

    fireEvent.click(screen.getByRole("radio", { name: "Epee" }));

    expect(screen.getByText("Weapon: Epee")).toBeInTheDocument();
  });

  it("shows Age Category: Y10 as a tag", async () => {
    await openSheet();

    await chooseAgeCategory("y10");

    expect(screen.getByText("Age Category: Y10")).toBeInTheDocument();
  });

  it("Clear All then Show Fencers clears all five filters", async () => {
    currentParams = new URLSearchParams(
      "team=Salle+Nord&weapon=foil&ageCategory=y10&rating=C&gender=F",
    );
    await openSheet();

    fireEvent.click(screen.getByRole("button", { name: "Clear All" }));
    fireEvent.click(screen.getByRole("button", { name: "Show Fencers" }));

    expect(replace).toHaveBeenLastCalledWith("/fencers", { scroll: false });
  });

  it("scope=event renders neither Weapon chips nor the Age Category select", async () => {
    await openSheet("event");

    expect(screen.queryByRole("radio", { name: "Foil" })).not.toBeInTheDocument();
    expect(document.querySelector('select[name="ageCategory"]')).not.toBeInTheDocument();
  });

  it("scope=event strips weapon and ageCategory from the URL on submit", async () => {
    currentParams = new URLSearchParams("team=Salle+Nord&weapon=foil&ageCategory=y10");
    await openSheet("event");

    fireEvent.click(screen.getByRole("button", { name: "Show Fencers" }));

    expect(replace).toHaveBeenLastCalledWith("/fencers?team=Salle+Nord", { scroll: false });
  });
});
