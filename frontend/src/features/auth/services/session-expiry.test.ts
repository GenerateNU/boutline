import { logout } from "./auth-actions";
import { expireSession, resetSessionExpiry } from "./session-expiry";

jest.mock("./auth-actions", () => ({ logout: jest.fn() }));

const LOGIN_URL = "/login?next=%2Fadmin%2Ftournaments%3Fstep%3D2";

describe("expireSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSessionExpiry();
    (logout as jest.Mock).mockResolvedValue(undefined);
    window.history.pushState({}, "", "/admin/tournaments?step=2");
  });

  it("shares one logout and one redirect between concurrent callers", async () => {
    const navigate = jest.fn();

    await Promise.all([expireSession(navigate), expireSession(navigate), expireSession(navigate)]);

    expect(logout).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(LOGIN_URL);
  });

  it("still redirects when the logout action fails", async () => {
    (logout as jest.Mock).mockRejectedValue(new Error("network"));
    const navigate = jest.fn();

    await expireSession(navigate);

    expect(navigate).toHaveBeenCalledWith(LOGIN_URL);
  });

  it("does not run again after it settles, only after a reset", async () => {
    const navigate = jest.fn();

    await expireSession(navigate);
    await expireSession(navigate);
    expect(logout).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledTimes(1);

    resetSessionExpiry();
    await expireSession(navigate);
    expect(logout).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenCalledTimes(2);
  });
});
