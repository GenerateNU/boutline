import type { Competitor } from "@/types/competitor";

const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

export async function getCompetitor(id: string): Promise<Competitor | null> {
  const url = new URL(`/api/v1/competitors/${encodeURIComponent(id)}`, apiProxyTarget);

  const response = await fetch(url, { cache: "no-store" });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`get competitor: ${response.status}`);
  }

  return response.json();
}
