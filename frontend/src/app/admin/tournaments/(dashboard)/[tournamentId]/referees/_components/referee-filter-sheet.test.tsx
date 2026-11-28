import { act, fireEvent, render, screen } from "@testing-library/react";

import { apiRequest } from "@/services/api-request";

import type { PoolOption } from "../_services/get-tournament-pools";
import { RefereeFilterSheet } from "./referee-filter-sheet";

const replace = jest.fn();
let currentParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/referees",
  useSearchParams: () => currentParams,
}));
jest.mock("../../../../../../../services/api-request", () => ({ apiRequest: jest.fn() }));

const apiRequestMock = jest.mocked(apiRequest);

const SAM = { first_name: "Sam", last_name: "Rivera", email: "sam.rivera@boutline.dev" };

// The filter offers every pool, started or not.
const POOLS: PoolOption[] = [
  { id: "p-1", label: "Pool 1 · Y14 Foil", upcoming: false },
  { id: "p-2", label: "Pool 1 · Cadet Epee", upcoming: true },
];

async function openSheet(canSeeEmails = true) {
  render(<RefereeFilterSheet tournamentId="t 1" canSeeEmails={canSeeEmails} pools={POOLS} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Filter referees" }));
  });
}

async function search(field: string, term: string) {
  const box = screen.getByRole("searchbox", { name: field });
  fireEvent.focus(box);
  fireEvent.change(box, { target: { value: term } });
  await act(async () => {
    jest.advanceTimersByTime(300);
  });
}

function showReferees() {
  fireEvent.click(screen.getByRole("button", { name: "Show Referees" }));
}

describe("RefereeFilterSheet", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    replace.mockClear();
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue({ data: [SAM], total: 1, limit: 10, offset: 0 });
    currentParams = new URLSearchParams();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([
    { who: "an admin", canSeeEmails: true, fields: ["Referee", "Email"] },
    { who: "a referee", canSeeEmails: false, fields: ["Referee"] },
  ])("shows $who the fields they can filter by", async ({ canSeeEmails, fields }) => {
    await openSheet(canSeeEmails);

    expect(screen.getAllByRole("searchbox").map((box) => box.getAttribute("aria-label"))).toEqual(fields);
  });

  it.each([
    {
      field: "Referee",
      term: "riv",
      pick: "Sam Rivera",
      request: "/tournaments/t%201/users?role=referee&limit=10&q=riv",
      url: "/referees?q=Sam+Rivera",
    },
    {
      field: "Email",
      term: "sam@",
      pick: "sam.rivera@boutline.dev",
      request: "/tournaments/t%201/users?role=referee&limit=10&email=sam%40",
      url: "/referees?email=sam.rivera%40boutline.dev",
    },
  ])("filters by a $field picked from the referees found", async ({ field, term, pick, request, url }) => {
    await openSheet();

    await search(field, term);
    fireEvent.click(screen.getByRole("button", { name: pick }));
    showReferees();

    expect(apiRequestMock).toHaveBeenLastCalledWith(request);
    expect(replace).toHaveBeenLastCalledWith(url, { scroll: false });
  });

  it("filters by a pool picked from the tournament's pools, started ones included", async () => {
    await openSheet();
    expect(
      [...document.querySelectorAll('select[name="pool"] option')].map((option) => option.textContent).filter(Boolean),
    ).toEqual(["Pool 1 · Y14 Foil", "Pool 1 · Cadet Epee"]);

    // Radix keeps a native <select> in sync for forms; picking through it is far faster in jsdom.
    fireEvent.change(document.querySelector('select[name="pool"]')!, { target: { value: "p-2" } });
    showReferees();

    expect(replace).toHaveBeenLastCalledWith("/referees?pool=p-2", { scroll: false });
  });

  it("reopens with the applied filters as tags, and Clear All drops them", async () => {
    currentParams = new URLSearchParams("email=sam%40&pool=p-1");
    await openSheet();
    expect(screen.getByRole("button", { name: "Remove Email: sam@" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Pool: Pool 1 · Y14 Foil" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear All" }));
    showReferees();

    expect(replace).toHaveBeenLastCalledWith("/referees", { scroll: false });
  });
});
