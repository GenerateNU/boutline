import { getTournament } from "@/features/tournament/services/getTournament";

describe("getTournament", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it("requests the tournament by id and returns the parsed body", async () => {
    const body = { id: "t1", name: "Spring Open" };
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => body });

    const result = await getTournament("t1");

    expect(result).toEqual(body);
    const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(requestedUrl.pathname).toBe("/api/v1/tournaments/t1");
  });

  it("resolves null when the tournament does not exist", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });

    await expect(getTournament("missing")).resolves.toBeNull();
  });

  it("throws when the backend responds with an error status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(getTournament("t1")).rejects.toThrow("get tournament: 500");
  });
});
