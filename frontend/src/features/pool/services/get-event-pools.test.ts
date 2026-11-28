import { getEventPools } from "./get-event-pools";

function page(ids: string[], total: number, offset: number) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ data: ids.map((id) => ({ id })), total, limit: 100, offset }),
  };
}

describe("getEventPools", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it.each([
    { name: "no pools", total: 0, pages: [[]] },
    { name: "a single page", total: 2, pages: [["p1", "p2"]] },
    { name: "every page past the first", total: 201, pages: [["p1"], ["p2"], ["p3"]] },
  ])("returns the pools from $name", async ({ total, pages }) => {
    fetchMock.mockImplementation(async (url: URL) => {
      const offset = Number(url.searchParams.get("offset"));
      return page(pages[offset / 100], total, offset);
    });

    const pools = await getEventPools("e1");

    expect(pools.map(({ id }) => id)).toEqual(pages.flat());
    const urls = fetchMock.mock.calls.map(([url]) => new URL(url));
    for (const url of urls) {
      expect(url.pathname).toBe("/api/v1/pool-sheets");
      expect(url.searchParams.get("event_id")).toBe("e1");
      expect(url.searchParams.get("limit")).toBe("100");
    }
  });

  it("throws when the backend responds with an error status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(getEventPools("e1")).rejects.toThrow("Request failed with status 500");
  });
});
