import { act, render, waitFor } from "@testing-library/react";

import { SessionWatcher } from "@/features/auth/components/session-watcher";
import { logout } from "@/features/auth/services/auth-actions";
import { apiRequest } from "@/services/api-request";

const replace = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
// next/jest rewrites the @/ alias in imports but not in jest.mock paths.
jest.mock("../services/auth-actions", () => ({ logout: jest.fn() }));

const LOGIN_URL = "/login?next=%2Fadmin%2Ftournaments%3Fstep%3D2";

function respondWith(status: number) {
  global.fetch = jest.fn(async () => ({
    ok: status < 400,
    status,
    json: async () => ({ detail: "x" }),
  })) as unknown as typeof fetch;
}

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: state });
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe("SessionWatcher", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (logout as jest.Mock).mockResolvedValue(undefined);
    window.history.pushState({}, "", "/admin/tournaments?step=2");
    setVisibility("visible");
  });

  it.each([
    { name: "a 401", status: 401, redirected: true },
    { name: "a 200", status: 200, redirected: false },
    { name: "a 500", status: 500, redirected: false },
    { name: "a 503", status: 503, redirected: false },
  ])("on focus, $name from /auth/me redirects: $redirected", async ({ status, redirected }) => {
    respondWith(status);
    render(<SessionWatcher />);

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    await settle();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    if (redirected) {
      await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
      expect(replace).toHaveBeenCalledWith(LOGIN_URL);
      expect(logout).toHaveBeenCalledTimes(1);
    } else {
      expect(replace).not.toHaveBeenCalled();
    }
  });

  it("does not log out when the backend is unreachable", async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError("fetch failed"));
    render(<SessionWatcher />);

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    await settle();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
  });

  it.each([
    { state: "visible" as const, requests: 1 },
    { state: "hidden" as const, requests: 0 },
  ])("on visibilitychange to $state makes $requests request(s)", async ({ state, requests }) => {
    respondWith(200);
    render(<SessionWatcher />);
    setVisibility(state);

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await settle();

    expect(global.fetch).toHaveBeenCalledTimes(requests);
  });

  it("runs one check when focus and visibilitychange fire together", async () => {
    respondWith(200);
    render(<SessionWatcher />);

    act(() => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await settle();

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("logs out once when several requests 401 together, and each still rejects", async () => {
    respondWith(401);
    render(<SessionWatcher />);

    const results = await Promise.allSettled([apiRequest("/a"), apiRequest("/b"), apiRequest("/c")]);
    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));

    expect(results.map((result) => result.status)).toEqual(["rejected", "rejected", "rejected"]);
    results.forEach((result) => {
      expect((result as PromiseRejectedResult).reason).toMatchObject({ status: 401 });
    });
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("stops reacting after it unmounts", async () => {
    respondWith(401);
    const { unmount } = render(<SessionWatcher />);
    unmount();

    await apiRequest("/a").catch(() => undefined);
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    await settle();

    expect(replace).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
