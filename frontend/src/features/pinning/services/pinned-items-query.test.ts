import { fetchPinnedFencers } from "@/features/pinning/services/pinned-items-query";
import { Competitor } from "@/types/competitor";

function fencer(id: string, firstName: string, lastName: string): Competitor {
  return { id, eventId: "e1", firstName, lastName, rating: "A", ratingYear: null, team: "" };
}

describe("fetchPinnedFencers", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  function respondWith(data: Competitor[]) {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data, total: data.length, limit: data.length, offset: 0 }),
    });
  }

  it("fetches the pinned fencers by id", async () => {
    respondWith([fencer("f1", "Jane", "Doe")]);

    await fetchPinnedFencers(["f1", "f2"]);

    const url = new URL(fetchMock.mock.calls[0][0] as string, "http://localhost");
    expect(url.pathname).toBe("/api/v1/competitors");
    expect(url.searchParams.get("ids")).toBe("f1,f2");
    expect(url.searchParams.get("limit")).toBe("2");
  });

  it("sorts them alphabetically, ignoring case", async () => {
    respondWith([fencer("f1", "Zoe", "Adams"), fencer("f2", "Max", "Cole"), fencer("f3", "amy", "Brown")]);

    const fencers = await fetchPinnedFencers(["f1", "f2", "f3"]);

    expect(fencers.map(({ firstName }) => firstName)).toEqual(["amy", "Max", "Zoe"]);
  });

  it("makes no request when nothing is pinned", async () => {
    expect(await fetchPinnedFencers([])).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
