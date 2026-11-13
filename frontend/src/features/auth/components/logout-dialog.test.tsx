import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { LogoutDialog } from "@/features/auth/components/logout-dialog";
import { logout } from "@/features/auth/services/auth-actions";

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
// next/jest rewrites the @/ alias in imports but not in jest.mock paths.
jest.mock("../services/auth-actions", () => ({ logout: jest.fn() }));

describe("LogoutDialog", () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    { button: "Yes, log out", loggedOut: true },
    { button: "Cancel", loggedOut: false },
  ])("$button logs out: $loggedOut", async ({ button, loggedOut }) => {
    render(<LogoutDialog />);

    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    fireEvent.click(screen.getByRole("button", { name: button }));

    if (loggedOut) {
      await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
    } else {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    }
    expect(logout).toHaveBeenCalledTimes(loggedOut ? 1 : 0);
  });
});
