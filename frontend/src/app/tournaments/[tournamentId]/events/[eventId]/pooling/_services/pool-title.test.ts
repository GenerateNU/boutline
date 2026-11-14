import type { PoolBoard } from "../_types/pool-board";

import { poolTitle } from "./pool-title";

describe("poolTitle", () => {
  it.each([
    { strip: "Strip 3", expected: "Pool 1 · Strip 3" },
    { strip: null, expected: "Pool 1" },
  ])("titles a pool on strip $strip as '$expected'", ({ strip, expected }) => {
    expect(poolTitle({ number: 1, strip } as PoolBoard)).toBe(expected);
  });
});
