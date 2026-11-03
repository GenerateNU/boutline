import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { login } from "@/features/auth/services/auth-actions";

import { LoginForm } from "./login-form";

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
// next/jest rewrites the @/ alias in imports but not in jest.mock paths.
jest.mock("../../../features/auth/services/auth-actions", () => ({ login: jest.fn() }));

function submit() {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.co" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "pw" } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("LoginForm", () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    {
      name: "shows the server error when login fails",
      result: { ok: false, error: "invalid credentials" },
      alert: "invalid credentials",
      pushed: 0,
    },
    { name: "redirects after a successful login", result: { ok: true }, alert: null, pushed: 1 },
  ])("$name", async ({ result, alert, pushed }) => {
    jest.mocked(login).mockResolvedValue(result as never);
    render(<LoginForm redirectTo="/admin" signupHref="/signup" />);

    submit();

    if (alert) {
      expect(await screen.findByRole("alert")).toHaveTextContent(alert);
    }
    await waitFor(() => expect(push).toHaveBeenCalledTimes(pushed));
  });
});
