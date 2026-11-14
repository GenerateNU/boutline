import { getEventPoolStage } from "./get-event-pool-stage";

describe("getEventPoolStage", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  function respond(data: { id: string }[]) {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data, total: data.length, limit: 1, offset: 0 }),
    });
  }

  const cases = [
    { name: "the first stage", data: [{ id: "ps1" }, { id: "ps2" }], expected: { id: "ps1" } },
    { name: "null for an empty list", data: [], expected: null },
  ];

  it.each(cases)("returns $name", async ({ data, expected }) => {
    respond(data);

    await expect(getEventPoolStage("e1")).resolves.toEqual(expected);
  });

  it("requests the event's newest stage", async () => {
    respond([]);

    await getEventPoolStage("e1");

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe("/api/v1/pool-stages");
    expect(url.searchParams.get("event_id")).toBe("e1");
    expect(url.searchParams.get("limit")).toBe("1");
  });

  it("throws when the backend responds with an error status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(getEventPoolStage("e1")).rejects.toThrow("list pool stages: 500");
  });
});
