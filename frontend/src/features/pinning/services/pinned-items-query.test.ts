import { fetchPinnedItems } from "@/features/pinning/services/pinned-items-query";
import { Competitor } from "@/types/competitor";

function fencer(id: string, firstName: string, lastName: string): Competitor {
  return { id, eventId: "e1", firstName, lastName, rating: "A", ratingYear: null, team: "" };
}

describe("fetchPinnedItems", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  function respondWith(data: unknown[]) {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data, total: data.length, limit: data.length, offset: 0 }),
    });
  }

  function requestAt(call: number) {
    return new URL(fetchMock.mock.calls[call][0] as string, "http://localhost");
  }

  it("fetches the pinned fencers by id", async () => {
    respondWith([fencer("f1", "Jane", "Doe")]);

    await fetchPinnedItems({ fencerIds: ["f1", "f2"], boutIds: ["m1"] });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(requestAt(0).pathname).toBe("/api/v1/competitors");
    expect(requestAt(0).searchParams.get("ids")).toBe("f1,f2");
    expect(requestAt(0).searchParams.get("limit")).toBe("2");
  });

  it("sorts fencers alphabetically, ignoring case", async () => {
    respondWith([fencer("f1", "Zoe", "Adams"), fencer("f2", "Max", "Cole"), fencer("f3", "amy", "Brown")]);

    const result = await fetchPinnedItems({ fencerIds: ["f1", "f2", "f3"], boutIds: [] });

    expect(result.fencers.map(({ firstName }) => firstName)).toEqual(["amy", "Max", "Zoe"]);
  });

  it("makes no request when nothing is pinned", async () => {
    const result = await fetchPinnedItems({ fencerIds: [], boutIds: [] });

    expect(result).toEqual({ fencers: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    { count: 100, wantSizes: [100] },
    { count: 150, wantSizes: [100, 50] },
  ])("splits $count fencer ids into requests of $wantSizes", async ({ count, wantSizes }) => {
    const ids = Array.from({ length: count }, (_, i) => `f${i}`);
    wantSizes.forEach(() => respondWith([]));

    await fetchPinnedItems({ fencerIds: ids, boutIds: [] });

    expect(fetchMock).toHaveBeenCalledTimes(wantSizes.length);
    wantSizes.forEach((size, i) => {
      expect(requestAt(i).searchParams.get("ids")?.split(",")).toHaveLength(size);
      expect(requestAt(i).searchParams.get("limit")).toBe(String(size));
    });
  });
});
