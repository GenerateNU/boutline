import { format, isValid, parse } from "date-fns";

const DATE_PARAM_FORMAT = "yyyy-MM-dd";

export function parseDateParam(value: string | null | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }
  const date = parse(value, DATE_PARAM_FORMAT, new Date());
  return isValid(date) ? date : undefined;
}

export function formatDateParam(date: Date): string {
  return format(date, DATE_PARAM_FORMAT);
}

// The server has no browser clock to read, so "today" comes from the request's
// time zone, falling back to UTC when it's missing or not a real zone.
export function todayDateParam(timeZone = "UTC", now = new Date()): string {
  const format = (zone: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  try {
    return format(timeZone);
  } catch (error) {
    if (!(error instanceof RangeError)) {
      throw error;
    }
    return format("UTC");
  }
}
