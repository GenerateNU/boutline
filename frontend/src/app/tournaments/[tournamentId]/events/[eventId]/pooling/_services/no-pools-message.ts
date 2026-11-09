export function noPoolsMessage(search: string): string {
  const query = search.trim();
  return query ? `No pools match "${query}".` : "No pools yet.";
}
