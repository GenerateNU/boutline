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
});
