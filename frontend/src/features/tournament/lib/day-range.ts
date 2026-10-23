function offsetMinutes(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const value = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUTC = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second"),
  );
  return (asUTC - instant) / 60000;
}

function zonedMidnight(utcMidnight: number, timeZone: string): number {
  const result = utcMidnight - offsetMinutes(utcMidnight, timeZone) * 60000;
  // Midnight can sit in a different offset than the UTC guess on DST days.
  return utcMidnight - offsetMinutes(result, timeZone) * 60000;
}

export function dayRange(date: string, timeZone = "UTC"): { from: Date; to: Date } {
  const [year, month, day] = date.split("-").map(Number);
  const start = Date.UTC(year, month - 1, day);
  const next = Date.UTC(year, month - 1, day + 1);
  try {
    return {
      from: new Date(zonedMidnight(start, timeZone)),
      to: new Date(zonedMidnight(next, timeZone)),
    };
  } catch (error) {
    if (!(error instanceof RangeError)) {
      throw error;
    }
    return { from: new Date(start), to: new Date(next) };
  }
}
