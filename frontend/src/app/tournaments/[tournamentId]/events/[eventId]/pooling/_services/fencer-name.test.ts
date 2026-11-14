import type { PoolFencer } from "../_types/pool-board";

import { fencerListName, fencerName } from "./fencer-name";

const fencer = { first_name: "Maximilian", last_name: "Delacroix-Ortega" } as PoolFencer;

describe("fencer name formats", () => {
  it.each([
    { format: fencerName, expected: "Maximilian Delacroix-Ortega" },
    { format: fencerListName, expected: "Delacroix-Ortega, Maximilian" },
  ])("$format.name formats as '$expected'", ({ format, expected }) => {
    expect(format(fencer)).toBe(expected);
  });
});
