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

beforeAll(() => {
  // jsdom lacks these; Radix calls them when opening and picking items.
  Element.prototype.scrollIntoView = jest.fn();
  Element.prototype.hasPointerCapture = jest.fn();
  Element.prototype.releasePointerCapture = jest.fn();
});

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

  it("shows the picked club as a tag and drops the club and rating after Clear All", async () => {
    currentParams = new URLSearchParams("team=Salle+Nord&rating=C&offset=20");
    await openSheet();
    expect(screen.getByRole("button", { name: "Remove Salle Nord" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Rating Category" })).toHaveTextContent("C");

    fireEvent.click(screen.getByRole("button", { name: "Clear All" }));
    expect(screen.queryByText("Salle Nord")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show Fencers" }));

    expect(replace).toHaveBeenLastCalledWith("/fencers", { scroll: false });
  });

  it("offers a Club search and a Rating Category with every rating", async () => {
    await openSheet();

    expect(screen.getAllByRole("searchbox").map((box) => box.getAttribute("aria-label"))).toEqual(["Club"]);
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Rating Category" }), { key: "Enter" });
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
      "U",
    ]);
  });

  it("lists the sections in order, with the unbacked ones disabled", async () => {
    await openSheet();

    const labels = screen
      .getAllByText(/^(Club|Weapon|Age Category|Rating Category|Gender)$/)
      .map((node) => node.textContent);
    expect(labels).toEqual(["Club", "Weapon", "Age Category", "Rating Category", "Gender"]);
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Age Category" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Rating Category" })).toBeEnabled();
    screen.getAllByRole("radio").forEach((radio) => expect(radio).toBeDisabled());
    expect(screen.getAllByRole("radio").map((radio) => radio.textContent)).toEqual([
      "Foil",
      "Sabre",
      "Epee",
      "Women",
      "Men",
      "Other",
    ]);
  });

  it("filters by a picked rating and keeps the club from the URL", async () => {
    currentParams = new URLSearchParams("team=Salle+Nord");
    await openSheet();

    fireEvent.keyDown(screen.getByRole("combobox", { name: "Rating Category" }), { key: "Enter" });
    fireEvent.click(screen.getByRole("option", { name: "B" }));
    fireEvent.click(screen.getByRole("button", { name: "Show Fencers" }));

    expect(replace).toHaveBeenLastCalledWith("/fencers?team=Salle+Nord&rating=B", { scroll: false });
  });

  it("picking a club adds a tag and clears the search", async () => {
    await openSheet();
    await search("b");

    fireEvent.click(screen.getByRole("button", { name: "Boston Blade Club" }));

    expect(screen.getByRole("button", { name: "Remove Boston Blade Club" })).toBeInTheDocument();
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

    await search("bos");
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
});
