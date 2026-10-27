import { getEvents } from "@/features/event/services/getEvents";

function page(ids: string[], total: number, offset: number) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ data: ids.map((id) => ({ id })), total, limit: 100, offset }),
  };
}

describe("getEvents", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  const cases = [
    { name: "a single page", total: 2, pages: [["e1", "e2"]] },
    { name: "every page past the first", total: 201, pages: [["e1"], ["e2"], ["e3"]] },
  ];

  it.each(cases)("returns the events from $name", async ({ total, pages }) => {
    fetchMock.mockImplementation(async (url: URL) => {
      const offset = Number(url.searchParams.get("offset"));
      return page(pages[offset / 100], total, offset);
    });

    const events = await getEvents("t1");

    expect(events.map(({ id }) => id)).toEqual(pages.flat());
    const urls = fetchMock.mock.calls.map(([url]) => new URL(url));
    expect(urls.map((url) => url.searchParams.get("offset"))).toEqual(
      pages.map((_, i) => String(i * 100)),
    );
    for (const url of urls) {
      expect(url.pathname).toBe("/api/v1/events");
      expect(url.searchParams.get("tournament_id")).toBe("t1");
      expect(url.searchParams.get("limit")).toBe("100");
    }
  });

  it("throws when the backend responds with an error status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(getEvents("t1")).rejects.toThrow("list events: 500");
  });
});
