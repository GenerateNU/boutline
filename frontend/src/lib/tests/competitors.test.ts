import { PAGE_SIZE } from "@/lib/api";
import { listCompetitors, listTeams } from "@/lib/competitors";

jest.mock("next/server", () => ({ connection: async () => {} }));

const page = { data: [], total: 0, limit: PAGE_SIZE, offset: 0 };

function mockFetch(body: unknown = page, ok = true, status = 200) {
  const fetchMock = jest.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function requestedUrl(fetchMock: jest.Mock) {
  return new URL(String(fetchMock.mock.calls[0][0]));
}

describe("listCompetitors", () => {
  it.each([
    {
      name: "defaults",
      args: {},
      want: { limit: String(PAGE_SIZE), offset: null, search: null },
    },
    { name: "an empty search", args: { search: "" }, want: { search: null } },
    { name: "a search", args: { search: "chen" }, want: { search: "chen" } },
    { name: "an offset", args: { offset: 40 }, want: { offset: "40" } },
  ])("sends $name scoped to the tournament", async ({ args, want }) => {
    const fetchMock = mockFetch();
    await listCompetitors({ tournamentId: "t-1", ...args });

    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe("/api/v1/competitors");
    expect(url.searchParams.get("tournament_id")).toBe("t-1");
    for (const [key, value] of Object.entries(want)) {
      expect(url.searchParams.get(key)).toBe(value);
    }
  });

  it("throws when the backend fails", async () => {
    mockFetch({}, false, 500);
    await expect(listCompetitors({ tournamentId: "t-1" })).rejects.toThrow(
      "failed with 500",
    );
  });
});

describe("listTeams", () => {
  it("puts the tournament in the path, not the query", async () => {
    const fetchMock = mockFetch();
    await listTeams({ tournamentId: "t-1", search: "allez" });

    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe("/api/v1/tournaments/t-1/teams");
    expect(url.searchParams.has("tournament_id")).toBe(false);
    expect(url.searchParams.get("search")).toBe("allez");
  });
});
