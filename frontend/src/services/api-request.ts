interface ProblemDetails {
  detail?: string;
  errors?: { location?: string; message?: string }[];
}

// Huma's top-level detail for a 422 is just "validation failed"; the field that
// failed and why are only in `errors`.
export function problemMessage(body: unknown, status: number) {
  const problem: ProblemDetails = body !== null && typeof body === "object" ? body : {};
  const reasons = (problem.errors ?? [])
    .map(({ location, message }) => [location, message].filter(Boolean).join(": "))
    .filter(Boolean);
  const detail = problem.detail ?? `Request failed with status ${status}`;
  return reasons.length > 0 ? `${detail} (${reasons.join("; ")})` : detail;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

// A hook so the auth feature can react to a dead session without src/services importing
// features (auth-actions imports problemMessage from here, so a direct import would cycle).
let unauthorizedHandler: (() => void) | undefined;

export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) {
      unauthorizedHandler = undefined;
    }
  };
}

// Paths are relative to /api/v1, which Next proxies to the backend (see next.config.ts).
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`/api/v1${path}`, { ...init, headers });
  if (response.status === 204) {
    return undefined as T;
  }
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // No JSON body (e.g. a proxy error page); problemMessage falls back to the status.
  }
  if (response.status === 401) {
    unauthorizedHandler?.();
  }
  if (!response.ok) {
    throw new ApiError(problemMessage(body, response.status), response.status);
  }
  return body as T;
}
