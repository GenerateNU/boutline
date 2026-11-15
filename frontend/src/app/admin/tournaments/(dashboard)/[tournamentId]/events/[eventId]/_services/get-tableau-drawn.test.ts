import { getTableauDrawn } from "./get-tableau-drawn";

describe("getTableauDrawn", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  function respond(rounds: unknown[]) {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ rounds }) });
  }

  const cases = [
    { name: "true once rounds exist", rounds: [{ size: 8, bouts: [] }], expected: true },
    { name: "false before the draw", rounds: [], expected: false },
  ];

  it.each(cases)("returns $name", async ({ rounds, expected }) => {
    respond(rounds);

    await expect(getTableauDrawn("e1")).resolves.toBe(expected);
  });

  it("requests the event's tableau", async () => {
    respond([]);

    await getTableauDrawn("e 1");

    expect(new URL(fetchMock.mock.calls[0][0]).pathname).toBe("/api/v1/events/e%201/tableau");
  });

  it("throws when the backend responds with an error status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(getTableauDrawn("e1")).rejects.toThrow("Request failed with status 500");
  });
});
