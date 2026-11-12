// UTC, like the event-schedule formatters, so a date reads the same in every time zone.
const shortDateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function formatShortDate(iso: string): string {
  return shortDateFormat.format(new Date(iso));
}
