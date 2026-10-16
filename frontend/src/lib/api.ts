import { connection } from "next/server";

const apiBaseUrl = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

export const PAGE_SIZE = 20;

export type Paginated<T> = {
  data: T[];
  total: number;
  limit: number;
  offset: number;
};

export async function apiGet<T>(
  path: string,
  query: Record<string, string | number | undefined> = {},
): Promise<T> {
  // Every call reads live data, so opt the calling page out of prerendering.
  await connection();

  const url = new URL(path, apiBaseUrl);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`GET ${path} failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}
