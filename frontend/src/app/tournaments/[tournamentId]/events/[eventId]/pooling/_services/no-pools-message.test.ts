import { noPoolsMessage } from "./no-pools-message";

describe("noPoolsMessage", () => {
  it.each([
    { case: "a search", search: " zzz ", expected: 'No pools match "zzz".' },
    { case: "no search", search: "  ", expected: "No pools yet." },
  ])("returns the message for $case", ({ search, expected }) => {
    expect(noPoolsMessage(search)).toBe(expected);
  });
});
