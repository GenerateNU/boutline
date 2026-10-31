import { getTableau } from "./tableau";

const fencer = (id: string, first: string, last: string, club: string, seed: number) => ({
  id,
  first_name: first,
  last_name: last,
  club,
  seed,
});

const maya = fencer("f-1", "Maya", "Chen", "Boston Fencing Club", 1);
const kenji = fencer("f-4", "Kenji", "Tanaka", "Northeastern Fencing", 4);

describe("getTableau", () => {
  const fetchMock = jest.fn();

  function respondWith(body: unknown) {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => body });
  }

  beforeEach(() => {
    global.fetch = fetchMock;
    respondWith({ rounds: [] });
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it.each([
    { name: "a plain id", eventId: "e-1", wantPath: "/api/v1/events/e-1/tableau" },
    { name: "an id needing encoding", eventId: "a/b c", wantPath: "/api/v1/events/a%2Fb%20c/tableau" },
  ])("requests the event's tableau with $name", async ({ eventId, wantPath }) => {
    await getTableau(eventId);

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe(wantPath);
  });

  it("maps the response to the Tableau shape", async () => {
    respondWith({
      rounds: [
        {
          size: 4,
          bouts: [{ id: "b-1", slot: 1, top: maya, bottom: kenji, top_score: 15, bottom_score: 9 }],
        },
        { size: 2, bouts: [] },
      ],
    });

    await expect(getTableau("e-1")).resolves.toEqual({
      rounds: [
        {
          id: "4",
          name: "Semi-finals",
          boutName: "Semi-final",
          bouts: [
            {
              id: "b-1",
              number: 1,
              top: {
                id: "f-1",
                firstName: "Maya",
                lastName: "Chen",
                club: "Boston Fencing Club",
                seed: 1,
              },
              bottom: {
                id: "f-4",
                firstName: "Kenji",
                lastName: "Tanaka",
                club: "Northeastern Fencing",
                seed: 4,
              },
              topScore: 15,
              bottomScore: 9,
            },
          ],
        },
        { id: "2", name: "Finals", boutName: "Final", bouts: [] },
      ],
    });
  });

  it("turns null scores into undefined", async () => {
    respondWith({
      rounds: [
        {
          size: 2,
          bouts: [{ id: "b-1", slot: 1, top: maya, bottom: kenji, top_score: null, bottom_score: null }],
        },
      ],
    });

    const { rounds } = await getTableau("e-1");

    expect(rounds[0].bouts[0].topScore).toBeUndefined();
    expect(rounds[0].bouts[0].bottomScore).toBeUndefined();
  });

  it("passes an undrawn tableau through as no rounds", async () => {
    await expect(getTableau("e-1")).resolves.toEqual({ rounds: [] });
  });

  it("throws when the backend responds with an error status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });

    await expect(getTableau("e-1")).rejects.toThrow("get tableau: 404");
  });
});
