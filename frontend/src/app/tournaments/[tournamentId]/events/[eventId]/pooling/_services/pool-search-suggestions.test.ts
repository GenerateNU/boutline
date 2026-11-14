import { poolSearchSuggestions } from "./pool-search-suggestions";

const options = {
  fencers: ["Ava Johnson", "Liam O'Brien", "Maya Chen", "Nora Silva", "Noah Park", "Nadia Okafor", "Nathan Lee", "Nina Ruiz"],
  clubs: ["Boston Fencing Club", "Northeastern Fencing", "NYAC Fencing"],
  poolNumbers: [1, 2],
};

function labels(query: string) {
  const { fencers, clubs } = poolSearchSuggestions(options, query);
  return { fencers: fencers.map(({ label }) => label), clubs: clubs.map(({ label }) => label) };
}

describe("poolSearchSuggestions", () => {
  it.each([
    { case: "an empty query", query: "  ", fencers: [], clubs: [] },
    { case: "a fencer-only match", query: "chen", fencers: ["Maya Chen"], clubs: [] },
    { case: "a club-only match", query: "nyac", fencers: [], clubs: ["NYAC Fencing"] },
    { case: "matches in both groups", query: "no", fencers: ["Nora Silva", "Noah Park"], clubs: ["Northeastern Fencing"] },
    { case: "no match", query: "zzz", fencers: [], clubs: [] },
  ])("splits $case into fencers and clubs", ({ query, fencers, clubs }) => {
    expect(labels(query)).toEqual({ fencers, clubs });
  });

  it("caps each group at five", () => {
    const { fencers, clubs } = labels("n");

    expect(fencers).toEqual(["Ava Johnson", "Liam O'Brien", "Maya Chen", "Nora Silva", "Noah Park"]);
    expect(clubs).toEqual(["Boston Fencing Club", "Northeastern Fencing", "NYAC Fencing"]);
  });
});
