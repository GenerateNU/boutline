import { fetchPinnedPools } from "@/features/pinning/services/pinned-pools-query";

describe("fetchPinnedPools", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it("fetches the pinned pools by id and returns them", async () => {
    const pools = [{ id: "p1" }, { id: "p2" }];
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: pools, total: 2, limit: 2, offset: 0 }),
    });

    expect(await fetchPinnedPools(["p1", "p2"])).toEqual(pools);

    const url = new URL(fetchMock.mock.calls[0][0] as string, "http://localhost");
    expect(url.pathname).toBe("/api/v1/pool-sheets");
    expect(url.searchParams.get("ids")).toBe("p1,p2");
    expect(url.searchParams.get("limit")).toBe("2");
  });

  it("makes no request when nothing is pinned", async () => {
    expect(await fetchPinnedPools([])).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
