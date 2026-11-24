import { buildPoolStageResult } from "../_fixtures/build-pool-stage-result";

import { filterPoolStageResults, NO_POOL_STAGE_RESULT_FILTERS } from "./filter-pool-stage-results";

const RESULTS = [
  buildPoolStageResult({ competitor_id: "chen", status: "advanced", pool_number: 1 }),
  buildPoolStageResult({
    competitor_id: "sato",
    first_name: "Hana",
    last_name: "Sato",
    club: "Northeastern Fencing",
    status: "advanced",
    pool_number: 2,
  }),
  buildPoolStageResult({
    competitor_id: "kowalski",
    first_name: "Ethan",
    last_name: "Kowalski",
    club: null,
    status: "eliminated",
    pool_number: 2,
  }),
];

describe("filterPoolStageResults", () => {
  it.each([
    { name: "no search or filters", search: "", filters: {}, want: ["chen", "sato", "kowalski"] },
    { name: "a full name", search: "  hana sato ", filters: {}, want: ["sato"] },
    { name: "a club", search: "boston", filters: {}, want: ["chen"] },
    { name: "a status", search: "", filters: { status: "eliminated" as const }, want: ["kowalski"] },
    { name: "a pool", search: "", filters: { poolNumber: 2 }, want: ["sato", "kowalski"] },
    {
      name: "search and filters together",
      search: "fencing",
      filters: { status: "advanced" as const, poolNumber: 2 },
      want: ["sato"],
    },
    { name: "nothing matching", search: "zzz", filters: {}, want: [] },
  ])("matches $name", ({ search, filters, want }) => {
    const matches = filterPoolStageResults(RESULTS, search, { ...NO_POOL_STAGE_RESULT_FILTERS, ...filters });

    expect(matches.map(({ competitor_id }) => competitor_id)).toEqual(want);
  });
});
