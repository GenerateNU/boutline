const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

// The server-side counterpart of apiRequest. Server Components fetch Node-side, where
// apiRequest's relative /api/v1 path throws, so this goes straight to the backend.
export async function serverRequest<T>(path: string): Promise<T> {
  const response = await fetch(new URL(`/api/v1${path}`, API_PROXY_TARGET), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}
