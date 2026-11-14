import { sessionAuthHeaders } from "@/features/auth/services/session";
import { getTournamentRole } from "@/features/tournament/services/getTournamentRole";

// next/jest rewrites the @/ alias in imports but not in jest.mock paths.
jest.mock("../../auth/services/session", () => ({ sessionAuthHeaders: jest.fn() }));

const sessionAuthHeadersMock = jest.mocked(sessionAuthHeaders);

describe("getTournamentRole", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock;
    sessionAuthHeadersMock.mockResolvedValue({ Authorization: "Bearer tok" });
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it.each([
    { name: "admin", status: 200, body: { role: "admin" }, want: "admin" },
    { name: "no role", status: 200, body: { role: null }, want: null },
  ])("resolves $want for $name", async ({ status, body, want }) => {
    fetchMock.mockResolvedValue({
      ok: status === 200,
      status,
      json: async () => body,
    });

    await expect(getTournamentRole("t1")).resolves.toBe(want);

    const [url, init] = fetchMock.mock.calls[0];
    expect(new URL(url as string).pathname).toBe("/api/v1/tournaments/t1/role");
    expect(init.headers).toEqual({ Authorization: "Bearer tok" });
  });

  it("resolves null without fetching when there is no session token", async () => {
    sessionAuthHeadersMock.mockResolvedValue({});

    await expect(getTournamentRole("t1")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws when the backend responds with an error status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(getTournamentRole("t1")).rejects.toThrow("get tournament role: 500");
  });
});
