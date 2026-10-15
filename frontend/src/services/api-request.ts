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

// Without a timeout, a request hung on a flaky connection never settles, so it can't
// fail into the caller's recovery.
const REQUEST_TIMEOUT_MS = 10_000;

// Only a body that isn't JSON (e.g. a proxy error page) counts as empty; a timeout or
// dropped connection while reading must still fail the request.
async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (caught) {
    if (caught instanceof SyntaxError) {
      return null;
    }
    throw caught;
  }
}

// Paths are relative to /api/v1, which Next proxies to the backend (see next.config.ts).
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const signal = init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  let response: Response;
  let body: unknown;
  // The timeout covers reading the body too, so both steps share one catch.
  try {
    response = await fetch(`/api/v1${path}`, { ...init, headers, signal });
    body = await readJson(response);
  } catch (caught) {
    const timedOut = caught instanceof DOMException && caught.name === "TimeoutError";
    if (timedOut) {
      throw new Error("The server took too long to respond");
    }
    throw caught;
  }
  if (!response.ok) {
    throw new Error(problemMessage(body, response.status));
  }
  return body as T;
}
