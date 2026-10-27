export type SearchParams = Record<string, string | string[] | undefined>;

// A repeated key (?q=a&q=b) arrives as an array, which no page expects, so it
// reads as absent.
export function readStringParam(query: SearchParams, key: string): string {
  const value = query[key];
  return typeof value === "string" ? value.trim() : "";
}

// Anything that isn't a non-negative number (missing, "abc", "-5") falls
// back to the first page instead of erroring.
export function readOffsetParam(query: SearchParams): number {
  return Math.max(0, Number(query.offset) || 0);
}
