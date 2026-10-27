import { getCompetitor } from "@/features/competitor/services/getCompetitor";

describe("getCompetitor", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it("requests the competitor by id and returns the parsed body", async () => {
    const body = { id: "c 1", firstName: "Yan", lastName: "Wang", rating: "A", team: "" };
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => body });

    expect(await getCompetitor("c 1")).toEqual(body);
    expect(new URL(fetchMock.mock.calls[0][0]).pathname).toBe("/api/v1/competitors/c%201");
  });

  it("returns null for a 404", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });

    expect(await getCompetitor("c1")).toBeNull();
  });

  it("throws on any other error status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(getCompetitor("c1")).rejects.toThrow("get competitor: 500");
  });
});
