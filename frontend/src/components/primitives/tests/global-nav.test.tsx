import { fireEvent, render, screen } from "@testing-library/react";

import { GlobalNav } from "@/components/primitives/global-nav";

jest.mock("next/navigation", () => ({
  usePathname: () => "/tournaments",
  useRouter: () => ({ push: jest.fn() }),
}));

describe("GlobalNav", () => {
  it("closes the drawer from its X button", () => {
    render(<GlobalNav />);

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Close menu" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("exposes the menu button as the drawer's trigger", () => {
    render(<GlobalNav />);

    const menu = screen.getByRole("button", { name: "Open menu" });
    expect(menu).toHaveAttribute("aria-haspopup", "dialog");
    expect(menu).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(menu);

    expect(menu).toHaveAttribute("aria-expanded", "true");
  });
});
