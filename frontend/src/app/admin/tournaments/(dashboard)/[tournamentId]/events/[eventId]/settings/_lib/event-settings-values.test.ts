import type { TournamentEvent } from "@/features/event/types/event";

import { updateFrom, valuesFrom } from "./event-settings-values";

const EVENT = {
  type: "individual",
  weapon: "foil",
  gender: "other",
  age_category: "junior",
  rating_limit: "div_1a",
  start_time: "2026-10-19T08:00:00.000Z",
} as TournamentEvent;

describe("updateFrom", () => {
  it.each([
    { name: "sends every set field and clears nothing when unchanged", patch: {}, clear: undefined },
    { name: "clears a type picked back to None", patch: { type: "" as const }, clear: ["type"] },
    {
      name: "clears type and age category together",
      patch: { type: "" as const, ageCategory: "" as const },
      clear: ["type", "age_category"],
    },
  ])("$name", ({ patch, clear }) => {
    const update = updateFrom({ ...valuesFrom(EVENT), ...patch }, EVENT);

    expect(update.clear).toEqual(clear);
    expect(update.rating_limit).toBe("div_1a");
    expect(update.start_time).toBe("2026-10-19T08:00:00.000Z");
  });

  it("doesn't clear a setting that was never set", () => {
    const event = { ...EVENT, type: null };

    expect(updateFrom(valuesFrom(event), event).clear).toBeUndefined();
  });
});
