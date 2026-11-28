import { poolStripTitle, stripBody, stripNumber } from "@/features/pool/lib/pool-strip";

describe("stripNumber", () => {
  it.each([
    [null, ""],
    ["Strip 3", "3"],
    ["strip   12", "12"],
    ["7", "7"],
  ])("%s -> %s", (strip, expected) => {
    expect(stripNumber(strip)).toBe(expected);
  });
});

describe("stripBody", () => {
  it.each([
    ["3", "Strip 3"],
    [" 3 ", "Strip 3"],
    ["   ", undefined],
    ["", undefined],
  ])("%j -> %s", (value, expected) => {
    expect(stripBody(value)).toBe(expected);
  });
});

describe("poolStripTitle", () => {
  it.each([
    [{ number: 1, strip: "Strip 3" }, "Pool 1 - Strip 3"],
    [{ number: 2, strip: null }, "Pool 2"],
  ])("%j -> %s", (pool, expected) => {
    expect(poolStripTitle(pool)).toBe(expected);
  });
});
