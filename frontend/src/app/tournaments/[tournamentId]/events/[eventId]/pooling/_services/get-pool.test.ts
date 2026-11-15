import { getPool } from "./get-pool";

describe("getPool", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it("returns the pool from the pool sheets endpoint", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: "p1", number: 1 }) });

    const pool = await getPool("p1");

    expect(pool).toEqual({ id: "p1", number: 1 });
    expect(new URL(fetchMock.mock.calls[0][0]).pathname).toBe("/api/v1/pool-sheets/p1");
  });

  it.each([404, 422])("returns null when the backend answers %i", async (status) => {
    fetchMock.mockResolvedValue({ ok: false, status });

    await expect(getPool("missing")).resolves.toBeNull();
  });

  it("throws on any other error status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(getPool("p1")).rejects.toThrow("Request failed with status 500");
  });
});
