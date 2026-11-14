import { buildPool } from "../_fixtures/build-pool";

import { matchingSuggestions, poolFilterOptions } from "./pool-filter-options";

describe("poolFilterOptions", () => {
  it("lists every fencer and club once, sorted, and the pool numbers in order", () => {
    const options = poolFilterOptions([
      buildPool({
        number: 2,
        fencers: [
          ["Zoe", "Kim", "MIT Fencing"],
          ["Ava", "Johnson", "Cambridge FC"],
        ],
      }),
      buildPool({
        number: 1,
        fencers: [
          ["Maya", "Chen", "Cambridge FC"],
          ["Liam", "O'Brien", "Boston Fencing Club"],
        ],
      }),
    ]);

    expect(options).toEqual({
      fencers: ["Ava Johnson", "Liam O'Brien", "Maya Chen", "Zoe Kim"],
      clubs: ["Boston Fencing Club", "Cambridge FC", "MIT Fencing"],
      poolNumbers: [1, 2],
    });
  });
});

describe("matchingSuggestions", () => {
  const options = ["Caitlin Lee", "Claire Min", "Zoe Kim"];

  it.each([
    { query: "", expected: null },
    { query: "   ", expected: null },
    { query: "zoe", expected: ["Zoe Kim"] },
    { query: " LE ", expected: ["Caitlin Lee"] },
    { query: "c", expected: ["Caitlin Lee", "Claire Min"] },
    { query: "zzz", expected: [] },
  ])("matches '$query'", ({ query, expected }) => {
    expect(matchingSuggestions(options, query)?.map(({ label }) => label) ?? null).toEqual(expected);
  });
});
