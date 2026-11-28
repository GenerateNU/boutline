import { joinStartTime, splitStartTime } from "./start-time-fields";

describe("start time fields", () => {
  it.each([
    { name: "a morning start", startTime: "2026-10-19T08:00:00.000Z", time: "08:00" },
    { name: "a late-evening start keeps its UTC day", startTime: "2026-10-19T23:45:00.000Z", time: "23:45" },
  ])("round-trips $name", ({ startTime, time }) => {
    const fields = splitStartTime(startTime);

    expect(fields.time).toBe(time);
    expect(fields.date?.getDate()).toBe(19);
    expect(joinStartTime(fields.date!, fields.time)).toBe(startTime);
  });

  it("leaves both fields empty without a start time", () => {
    expect(splitStartTime(null)).toEqual({ date: undefined, time: "" });
  });
});
