import { tableauRoundName } from "./tableau-round-name";

describe("tableauRoundName", () => {
  it.each([
    { size: 2, want: { name: "Finals", boutName: "Final" } },
    { size: 4, want: { name: "Semi-finals", boutName: "Semi-final" } },
    { size: 8, want: { name: "Quarter-finals", boutName: "Quarter-final" } },
    { size: 16, want: { name: "Table of 16", boutName: "Table of 16" } },
    { size: 64, want: { name: "Table of 64", boutName: "Table of 64" } },
  ])("names a round of $size", ({ size, want }) => {
    expect(tableauRoundName(size)).toEqual(want);
  });
});
