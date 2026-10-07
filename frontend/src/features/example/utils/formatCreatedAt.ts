// Pinned to UTC so server and client render the same string and hydration matches.
const formatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

export function formatCreatedAt(iso: string): string {
  return formatter.format(new Date(iso));
}
