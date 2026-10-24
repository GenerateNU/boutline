import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { signup } from "@/features/auth/services/auth-actions";

import { SignupForm } from "./signup-form";

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
// next/jest rewrites the @/ alias in imports but not in jest.mock paths.
jest.mock("../../../features/auth/services/auth-actions", () => ({ signup: jest.fn() }));

function fillAndSubmit(confirm: string) {
  const values = {
    "First name": "Ada",
    "Last name": "Lovelace",
    "New Email": "ada@example.com",
    "New Password": "secret",
    "Confirm password": confirm,
  };
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
  fireEvent.click(screen.getByRole("button", { name: "Register Account" }));
}

describe("SignupForm", () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    {
      name: "rejects mismatched passwords without calling the server",
      confirm: "other",
      result: { ok: true },
      alert: "Passwords don't match.",
      redirected: false,
      calls: 0,
    },
    {
      name: "shows the server error when signup fails",
      confirm: "secret",
      result: { ok: false, error: "email already in use" },
      alert: "email already in use",
      redirected: false,
      calls: 1,
    },
    {
      name: "redirects after a successful signup",
      confirm: "secret",
      result: { ok: true },
      alert: null,
      redirected: true,
      calls: 1,
    },
  ])("$name", async ({ confirm, result, alert, redirected, calls }) => {
    jest.mocked(signup).mockResolvedValue(result as never);
    render(<SignupForm redirectTo="/admin" loginHref="/login" />);

    fillAndSubmit(confirm);

    if (alert) {
      expect(await screen.findByRole("alert")).toHaveTextContent(alert);
    }
    await waitFor(() => expect(push).toHaveBeenCalledTimes(redirected ? 1 : 0));
    expect(signup).toHaveBeenCalledTimes(calls);
    if (redirected) {
      expect(push).toHaveBeenCalledWith("/admin");
    }
  });
});
