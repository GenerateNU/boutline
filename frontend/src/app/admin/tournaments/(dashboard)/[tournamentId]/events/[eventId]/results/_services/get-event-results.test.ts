import { getEventResults } from "./get-event-results";

function page(places: number[], total: number, offset: number) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      data: places.map((place) => ({ place })),
      total,
      limit: 100,
      offset,
    }),
  };
}

describe("getEventResults", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it.each([
    { name: "no results", total: 0, pages: [[]] },
    { name: "a single page", total: 2, pages: [[1, 2]] },
    { name: "every page past the first", total: 201, pages: [[1], [2], [3]] },
  ])("returns the results from $name", async ({ total, pages }) => {
    fetchMock.mockImplementation(async (url: URL) => {
      const offset = Number(url.searchParams.get("offset"));
      return page(pages[offset / 100], total, offset);
    });

    const { results, total: returnedTotal } = await getEventResults("e1");

    expect(results.map(({ place }) => place)).toEqual(pages.flat());
    expect(returnedTotal).toBe(total);
    for (const [url] of fetchMock.mock.calls) {
      expect(new URL(url).pathname).toBe("/api/v1/events/e1/results");
      expect(new URL(url).searchParams.get("limit")).toBe("100");
    }
  });

  it("throws when the backend responds with an error status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(getEventResults("e1")).rejects.toThrow(
      "Request failed with status 500",
    );
  });
});
