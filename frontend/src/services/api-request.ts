interface ProblemDetails {
  detail?: string;
  errors?: { location?: string; message?: string }[];
}

// Huma's top-level detail for a 422 is just "validation failed"; the field that
// failed and why are only in `errors`.
function problemMessage(body: unknown, status: number) {
  const problem: ProblemDetails = body !== null && typeof body === "object" ? body : {};
  const reasons = (problem.errors ?? [])
    .map(({ location, message }) => [location, message].filter(Boolean).join(": "))
    .filter(Boolean);
  const detail = problem.detail ?? `Request failed with status ${status}`;
  return reasons.length > 0 ? `${detail} (${reasons.join("; ")})` : detail;
}

// Paths are relative to /api/v1, which Next proxies to the backend (see next.config.ts).
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`/api/v1${path}`, { ...init, headers });
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // No JSON body (e.g. a proxy error page); problemMessage falls back to the status.
  }
  if (!response.ok) {
    throw new Error(problemMessage(body, response.status));
  }
  return body as T;
}
