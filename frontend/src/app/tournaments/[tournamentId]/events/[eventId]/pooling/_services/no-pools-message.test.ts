import { defaultPoolFilters } from "./apply-pool-filters";
import { noPoolsMessage } from "./no-pools-message";

describe("noPoolsMessage", () => {
  it.each([
    { case: "a search and filters", search: " zzz ", status: "ended" as const, expected: 'No pools match "zzz" with these filters.' },
    { case: "a search only", search: "zzz", status: null, expected: 'No pools match "zzz".' },
    { case: "filters only", search: "  ", status: "ended" as const, expected: "No pools match these filters." },
    { case: "neither", search: "", status: null, expected: "No pools yet." },
  ])("returns the message for $case", ({ search, status, expected }) => {
    expect(noPoolsMessage(search, { ...defaultPoolFilters, status })).toBe(expected);
  });
});
