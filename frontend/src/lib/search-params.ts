export type SearchParams = Record<string, string | string[] | undefined>;

// A repeated key (?q=a&q=b) arrives as an array, which no page expects, so it
// reads as absent.
export function readStringParam(query: SearchParams, key: string): string {
  const value = query[key];
  return typeof value === "string" ? value.trim() : "";
}

// Anything that isn't a non-negative integer (missing, "abc", "-5", "1.5")
// falls back to the first page, since the backend rejects it.
export function readOffsetParam(query: SearchParams): number {
  const offset = Number(query.offset);
  return Number.isInteger(offset) && offset > 0 ? offset : 0;
}
