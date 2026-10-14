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
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    headers: { "Content-Type": "application/json" },
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(problemMessage(body, response.status));
  }
  return body as T;
}
