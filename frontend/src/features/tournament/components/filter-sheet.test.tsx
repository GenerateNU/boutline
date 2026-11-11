import { act, fireEvent, render, screen } from "@testing-library/react";

import { FilterSheet } from "@/features/tournament/components/filter-sheet";
import { apiRequest } from "@/services/api-request";

const replace = jest.fn();
let currentParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/tournaments",
  useSearchParams: () => currentParams,
}));
jest.mock("../../../services/api-request", () => ({ apiRequest: jest.fn() }));

const apiRequestMock = jest.mocked(apiRequest);

function respond(path: string) {
  if (path.startsWith("/clubs")) {
    return {
      data: [
        { name: "Boston Blade Club", competitorCount: 3 },
        { name: "Salle Nord", competitorCount: 1 },
      ],
    };
  }
  return {
    data: [
      { code: "CA", tournament_count: 1 },
      { code: "FR", tournament_count: 2 },
      { code: "US", tournament_count: 5 },
    ],
  };
}

async function openSheet(visibility?: "public" | "private") {
  render(<FilterSheet visibility={visibility} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Filter tournaments" }));
  });
}

describe("FilterSheet", () => {
  beforeEach(() => {
    replace.mockClear();
    apiRequestMock.mockReset();
    apiRequestMock.mockImplementation(async (path) => respond(String(path)) as never);
    currentParams = new URLSearchParams();
  });

  it("loads clubs and visibility-scoped countries on open", async () => {
    await openSheet("public");

    expect(apiRequestMock).toHaveBeenCalledWith("/clubs?limit=10");
    expect(apiRequestMock).toHaveBeenCalledWith("/countries?visibility=public");
    expect(screen.getByRole("button", { name: "Salle Nord" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "France" })).toBeInTheDocument();
  });

  it("sets club and country params on submit", async () => {
    await openSheet();

    fireEvent.click(screen.getByRole("button", { name: "Salle Nord" }));
    fireEvent.click(screen.getByRole("radio", { name: "France" }));
    fireEvent.click(screen.getByRole("button", { name: "Show Tournaments" }));

    expect(replace).toHaveBeenLastCalledWith("/tournaments?club=Salle+Nord&country=FR", {
      scroll: false,
    });
  });

  it("clears club and country on Clear all", async () => {
    currentParams = new URLSearchParams("club=Salle+Nord&country=FR&query=open");
    await openSheet();

    fireEvent.click(screen.getByRole("button", { name: "Clear All" }));
    fireEvent.click(screen.getByRole("button", { name: "Show Tournaments" }));

    expect(replace).toHaveBeenLastCalledWith("/tournaments?query=open", { scroll: false });
  });

  it("cancels a pending club search and reloads all clubs on Clear all", async () => {
    jest.useFakeTimers();
    await openSheet();

    fireEvent.change(screen.getByRole("searchbox", { name: "Club" }), {
      target: { value: "Sal" },
    });
    apiRequestMock.mockClear();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Clear All" }));
      jest.advanceTimersByTime(300);
    });

    expect(apiRequestMock.mock.calls.map(([path]) => path)).toEqual(["/clubs?limit=10"]);
    jest.useRealTimers();
  });

  it("shows the active club even when it is not in the search results", async () => {
    currentParams = new URLSearchParams("club=Tokyo+Fencing+Club");
    await openSheet();

    const chip = screen.getByRole("button", { name: "Tokyo Fencing Club" });
    expect(chip).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(chip);
    fireEvent.click(screen.getByRole("button", { name: "Show Tournaments" }));

    expect(replace).toHaveBeenLastCalledWith("/tournaments", { scroll: false });
  });

  it("skips malformed country codes instead of crashing", async () => {
    apiRequestMock.mockImplementation(async (path) =>
      (String(path).startsWith("/countries")
        ? { data: [{ code: "USA", tournament_count: 1 }, { code: "FR", tournament_count: 2 }] }
        : respond(String(path))) as never,
    );
    await openSheet();

    expect(screen.getByRole("radio", { name: "France" })).toBeInTheDocument();
    expect(screen.queryByText("USA")).not.toBeInTheDocument();
  });

  it.each([
    { term: "fran", want: "France", hidden: ["Canada", "United States"] },
    { term: "United", want: "United States", hidden: ["France", "Canada"] },
  ])("filters country chips by $term", async ({ term, want, hidden }) => {
    await openSheet();

    fireEvent.change(screen.getByRole("searchbox", { name: "Country" }), {
      target: { value: term },
    });

    expect(screen.getByRole("radio", { name: want })).toBeInTheDocument();
    for (const name of hidden) {
      expect(screen.queryByRole("radio", { name })).not.toBeInTheDocument();
    }
  });
});
