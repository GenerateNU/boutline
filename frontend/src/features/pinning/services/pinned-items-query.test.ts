import { fetchPinnedItems } from "@/features/pinning/services/pinned-items-query";
import { Competitor } from "@/types/competitor";
import { Bout } from "@/types/bout";

describe("fetchPinnedItems", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  const fencer: Competitor = { id: "f1", firstName: "Jane", lastName: "Doe", rating: "A", team: "A" };
  const bout: Bout = {
    id: "m1",
    referee_id: null,
    competitor_1_id: "f1",
    competitor_2_id: "f2",
    points_to_win: 15,
    status: "upcoming",
  };

  it("requests both endpoints when both id lists are populated", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [fencer], total: 1, limit: 1, offset: 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [bout], total: 1, limit: 1, offset: 0 }),
      });

    const result = await fetchPinnedItems({ fencerIds: ["f1"], boutIds: ["m1"] });

    expect(result).toEqual({ fencers: [fencer], bouts: [bout] });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const competitorsUrl = new URL(fetchMock.mock.calls[0][0] as string, "http://localhost");
    expect(competitorsUrl.pathname).toBe("/api/v1/competitors");
    expect(competitorsUrl.searchParams.get("ids")).toBe("f1");
    expect(competitorsUrl.searchParams.get("limit")).toBe("1");

    const boutsUrl = new URL(fetchMock.mock.calls[1][0] as string, "http://localhost");
    expect(boutsUrl.pathname).toBe("/api/v1/bouts");
    expect(boutsUrl.searchParams.get("ids")).toBe("m1");
    expect(boutsUrl.searchParams.get("limit")).toBe("1");
  });

  it("requests only competitors when only fencerIds is populated", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: [fencer], total: 1, limit: 2, offset: 0 }),
    });

    const result = await fetchPinnedItems({ fencerIds: ["f1", "f2"], boutIds: [] });

    expect(result).toEqual({ fencers: [fencer], bouts: [] });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string, "http://localhost");
    expect(requestedUrl.pathname).toBe("/api/v1/competitors");
    expect(requestedUrl.searchParams.get("ids")).toBe("f1,f2");
    expect(requestedUrl.searchParams.get("limit")).toBe("2");
  });

  it("requests only bouts when only boutIds is populated", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: [bout], total: 1, limit: 1, offset: 0 }),
    });

    const result = await fetchPinnedItems({ fencerIds: [], boutIds: ["m1"] });

    expect(result).toEqual({ fencers: [], bouts: [bout] });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string, "http://localhost");
    expect(requestedUrl.pathname).toBe("/api/v1/bouts");
    expect(requestedUrl.searchParams.get("ids")).toBe("m1");
  });

  it("makes no requests and returns empty lists when both id lists are empty", async () => {
    const result = await fetchPinnedItems({ fencerIds: [], boutIds: [] });

    expect(result).toEqual({ fencers: [], bouts: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
