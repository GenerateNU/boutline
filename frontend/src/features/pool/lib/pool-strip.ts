export function stripNumber(strip: string | null): string {
  return strip?.replace(/^Strip\s+/i, "") ?? "";
}

export function stripBody(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? `Strip ${trimmed}` : undefined;
}

export function poolStripTitle(pool: { number: number; strip: string | null }): string {
  return pool.strip ? `Pool ${pool.number} - Strip ${stripNumber(pool.strip)}` : `Pool ${pool.number}`;
}
