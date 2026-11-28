import type { TournamentEvent } from "@/features/event/types/event";

import { getTournamentPools } from "./get-tournament-pools";

const EVENTS = [
  { id: "e-1", name: "Y14 Foil" },
  { id: "e-2", name: "Cadet Epee" },
] as TournamentEvent[];

const POOLS_BY_EVENT: Record<string, unknown[]> = {
  "e-1": [
    { id: "p-1", number: 1, status: "ended" },
    { id: "p-2", number: 2, status: "upcoming" },
  ],
  "e-2": [{ id: "p-3", number: 1, status: "active" }],
};

describe("getTournamentPools", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock;
    fetchMock.mockImplementation(async (url: URL) => {
      const data = POOLS_BY_EVENT[new URL(url).searchParams.get("event_id")!];
      return { ok: true, status: 200, json: async () => ({ data, total: data.length, limit: 100, offset: 0 }) };
    });
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it("labels every event's pools with their event and marks the upcoming ones", async () => {
    expect(await getTournamentPools(EVENTS)).toEqual([
      { id: "p-1", label: "Pool 1 · Y14 Foil", upcoming: false },
      { id: "p-2", label: "Pool 2 · Y14 Foil", upcoming: true },
      { id: "p-3", label: "Pool 1 · Cadet Epee", upcoming: false },
    ]);
  });

  it("asks for each event's pools", async () => {
    await getTournamentPools(EVENTS);

    expect(fetchMock.mock.calls.map(([url]) => new URL(url).search)).toEqual([
      "?event_id=e-1&limit=100",
      "?event_id=e-2&limit=100",
    ]);
  });

  it("makes no request for a tournament without events", async () => {
    expect(await getTournamentPools([])).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
