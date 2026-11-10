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

function typeInto(name: string, value: string) {
  const box = screen.getByRole("searchbox", { name });
  fireEvent.focus(box);
  fireEvent.change(box, { target: { value } });
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

  afterEach(() => {
    jest.useRealTimers();
  });

  it("loads countries on open but shows no suggestions until typing", async () => {
    await openSheet("public");

    expect(apiRequestMock.mock.calls.map(([path]) => path)).toEqual(["/countries?visibility=public"]);
    expect(screen.queryByRole("button", { name: "Salle Nord" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "France" })).not.toBeInTheDocument();
  });

  it("lists Country before Club, as in the Figma", async () => {
    await openSheet();

    expect(screen.getAllByRole("searchbox").map((box) => box.getAttribute("aria-label"))).toEqual([
      "Country",
      "Club",
    ]);
  });

  it("sets club and country params on submit", async () => {
    jest.useFakeTimers();
    await openSheet();

    typeInto("Club", "sal");
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    fireEvent.click(screen.getByRole("button", { name: "Salle Nord" }));
    typeInto("Country", "fran");
    fireEvent.click(screen.getByRole("button", { name: "France" }));
    fireEvent.click(screen.getByRole("button", { name: "Show Tournaments" }));

    expect(replace).toHaveBeenLastCalledWith("/tournaments?club=Salle+Nord&country=FR", {
      scroll: false,
    });
  });

  it("shows picked filters as tags that can be removed", async () => {
    currentParams = new URLSearchParams("club=Tokyo+Fencing+Club&country=FR");
    await openSheet();

    expect(screen.getByText("France")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove Tokyo Fencing Club" }));
    expect(screen.queryByText("Tokyo Fencing Club")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show Tournaments" }));

    expect(replace).toHaveBeenLastCalledWith("/tournaments?country=FR", { scroll: false });
  });

  it("clears club and country on Clear All", async () => {
    currentParams = new URLSearchParams("club=Salle+Nord&country=FR&query=open");
    await openSheet();

    fireEvent.click(screen.getByRole("button", { name: "Clear All" }));
    fireEvent.click(screen.getByRole("button", { name: "Show Tournaments" }));

    expect(replace).toHaveBeenLastCalledWith("/tournaments?query=open", { scroll: false });
  });

  it("cancels a pending club search on Clear All", async () => {
    jest.useFakeTimers();
    await openSheet();

    typeInto("Club", "Sal");
    apiRequestMock.mockClear();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Clear All" }));
      jest.advanceTimersByTime(300);
    });

    expect(apiRequestMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Salle Nord" })).not.toBeInTheDocument();
  });

  it("skips malformed country codes instead of crashing", async () => {
    apiRequestMock.mockImplementation(async (path) =>
      (String(path).startsWith("/countries")
        ? { data: [{ code: "USA", tournament_count: 1 }, { code: "FR", tournament_count: 2 }] }
        : respond(String(path))) as never,
    );
    await openSheet();
    typeInto("Country", "fr");

    expect(screen.getByRole("button", { name: "France" })).toBeInTheDocument();
    expect(screen.queryByText("USA")).not.toBeInTheDocument();
  });

  it.each([
    { term: "fran", want: "France", hidden: ["Canada", "United States"] },
    { term: "United", want: "United States", hidden: ["France", "Canada"] },
  ])("filters country chips by $term", async ({ term, want, hidden }) => {
    await openSheet();

    typeInto("Country", term);

    expect(screen.getByRole("button", { name: want })).toBeInTheDocument();
    for (const name of hidden) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });
});
