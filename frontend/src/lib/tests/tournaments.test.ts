import { PAGE_SIZE } from "@/lib/api";
import { listTournaments } from "@/lib/tournaments";

jest.mock("next/server", () => ({ connection: async () => {} }));

function mockFetch() {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ data: [], total: 0, limit: PAGE_SIZE, offset: 0 }),
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe("listTournaments", () => {
  it.each([
    { name: "no arguments", args: undefined, want: null },
    { name: "the first page", args: { offset: 0 }, want: "0" },
    { name: "a later page", args: { offset: 40 }, want: "40" },
  ])("requests $name", async ({ args, want }) => {
    const fetchMock = mockFetch();
    await listTournaments(args);

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname).toBe("/api/v1/tournaments");
    expect(url.searchParams.get("limit")).toBe(String(PAGE_SIZE));
    expect(url.searchParams.get("offset")).toBe(want);
  });
});
