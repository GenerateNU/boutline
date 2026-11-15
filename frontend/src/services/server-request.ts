import { ApiError, problemMessage } from "@/services/api-request";

const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

interface ServerRequestOptions {
  // Unset and empty values are left out, so optional filters can be passed as they are.
  params?: Record<string, string | number | undefined>;
  // The /api proxy adds the session header for browser calls; a server fetch sends the token itself.
  token?: string;
}

// Server Components and Server Actions fetch Node-side, where apiRequest's relative
// /api/v1 path throws, so they go straight to the backend at this URL.
export function serverURL(path: string): URL {
  return new URL(`/api/v1${path}`, API_PROXY_TARGET);
}

// The server-side counterpart of apiRequest.
export async function serverRequest<T>(
  path: string,
  { params = {}, token }: ServerRequestOptions = {},
): Promise<T> {
  const url = serverURL(path);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // No JSON body (e.g. a proxy error page); problemMessage falls back to the status.
    }
    throw new ApiError(`GET ${path}: ${problemMessage(body, response.status)}`, response.status);
  }
  return response.json();
}
