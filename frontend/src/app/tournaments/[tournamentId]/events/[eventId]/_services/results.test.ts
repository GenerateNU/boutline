import { getPoolStageResults } from "./results";

const result = (overrides: Record<string, unknown> = {}) => ({
  competitor_id: "c-1",
  first_name: "Maya",
  last_name: "Chen",
  club: "Boston Fencing Club",
  rating: "A",
  rating_year: 26,
  pool_number: 2,
  strip: "Strip 3",
  status: "advanced",
  place: 1,
  victories: 4,
  matches: 5,
  victory_ratio: 0.8,
  touches_scored: 20,
  touches_received: 10,
  indicator: 10,
  ...overrides,
});

describe("getPoolStageResults", () => {
  const fetchMock = jest.fn();

  function respondWith(body: unknown) {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => body });
  }

  const page = (data: unknown[], total: number, offset = 0) => ({ data, total, limit: 100, offset });

  beforeEach(() => {
    global.fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it.each([
    { name: "a plain id", eventId: "e-1", wantPath: "/api/v1/events/e-1/pool-stage-results" },
    { name: "an id needing encoding", eventId: "a/b c", wantPath: "/api/v1/events/a%2Fb%20c/pool-stage-results" },
  ])("requests the first page for $name", async ({ eventId, wantPath }) => {
    respondWith(page([], 0));

    await getPoolStageResults(eventId);

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe(wantPath);
    expect(url.searchParams.get("limit")).toBe("100");
    expect(url.searchParams.get("offset")).toBe("0");
  });

  it("fetches the remaining pages and keeps the API order", async () => {
    const firstPage = Array.from({ length: 100 }, (_, i) => result({ competitor_id: `c-${i + 1}`, place: i + 1 }));
    const secondPage = Array.from({ length: 50 }, (_, i) => result({ competitor_id: `c-${i + 101}`, place: i + 101 }));
    respondWith(page(firstPage, 150));
    respondWith(page(secondPage, 150, 100));

    const fencers = await getPoolStageResults("e-1");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new URL(fetchMock.mock.calls[1][0] as string).searchParams.get("offset")).toBe("100");
    expect(fencers.map((f) => f.place)).toEqual(Array.from({ length: 150 }, (_, i) => i + 1));
  });

  it("maps the response to ResultFencer", async () => {
    respondWith(page([result(), result({ competitor_id: "c-2", club: null, strip: null, status: "pending" })], 2));

    const [withClub, withoutClub] = await getPoolStageResults("e-1");

    expect(withClub).toEqual({
      id: "c-1",
      firstName: "Maya",
      lastName: "Chen",
      club: "Boston Fencing Club",
      rating: "A26",
      place: 1,
      pool: 2,
      strip: "Strip 3",
      status: "advanced",
    });
    expect(withoutClub).toMatchObject({ id: "c-2", club: "", strip: null, status: "pending" });
  });

  it.each([
    { rating: "A", year: 26, want: "A26" },
    { rating: "B", year: 5, want: "B05" },
    { rating: "C", year: null, want: "C" },
    { rating: "U", year: null, want: "U" },
  ])("labels rating $rating with year $year as $want", async ({ rating, year, want }) => {
    respondWith(page([result({ rating, rating_year: year })], 1));

    const [fencer] = await getPoolStageResults("e-1");

    expect(fencer.rating).toBe(want);
  });
});
