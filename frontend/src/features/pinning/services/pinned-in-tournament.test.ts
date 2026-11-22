import { pinnedInTournament } from "@/features/pinning/services/pinned-in-tournament";
import type { PinnedItems } from "@/features/pinning/types/pinning";

const PINNED: PinnedItems = {
  fencerIds: [],
  clubs: [
    { tournamentId: "t1", name: "Zeta FC" },
    { tournamentId: "t2", name: "Alpha FC" },
    { tournamentId: "t1", name: "alpha fc" },
  ],
  pools: [
    { tournamentId: "t1", eventId: "e2", eventName: "Womens Epee", id: "p3", title: "Pool 2" },
    { tournamentId: "t1", eventId: "e1", eventName: "Mens Foil", id: "p2", title: "Pool 10" },
    { tournamentId: "t2", eventId: "e1", eventName: "Mens Foil", id: "p1", title: "Pool 9" },
    { tournamentId: "t1", eventId: "e1", eventName: "Mens Foil", id: "p4", title: "Pool 9" },
  ],
  tableaus: [
    { tournamentId: "t1", eventId: "e2", eventName: "Womens Epee" },
    { tournamentId: "t2", eventId: "e3", eventName: "Cadet Sabre" },
    { tournamentId: "t1", eventId: "e1", eventName: "Mens Foil" },
  ],
};

describe("pinnedInTournament", () => {
  it("keeps only the given tournament's pins", () => {
    const { clubs, pools, tableaus } = pinnedInTournament(PINNED, "t2");

    expect(clubs.map(({ name }) => name)).toEqual(["Alpha FC"]);
    expect(pools.map(({ id }) => id)).toEqual(["p1"]);
    expect(tableaus.map(({ eventId }) => eventId)).toEqual(["e3"]);
  });

  it("returns every tournament's pins without one", () => {
    const { clubs, pools, tableaus } = pinnedInTournament(PINNED);

    expect(clubs).toHaveLength(3);
    expect(pools).toHaveLength(4);
    expect(tableaus).toHaveLength(3);
  });

  it("sorts clubs by name, pools by event then numeric title, tableaus by event", () => {
    const { clubs, pools, tableaus } = pinnedInTournament(PINNED, "t1");

    expect(clubs.map(({ name }) => name)).toEqual(["alpha fc", "Zeta FC"]);
    expect(pools.map(({ id }) => id)).toEqual(["p4", "p2", "p3"]);
    expect(tableaus.map(({ eventName }) => eventName)).toEqual(["Mens Foil", "Womens Epee"]);
  });
});
