import { fireEvent, render, screen } from "@testing-library/react";

import { Navbar } from "@/components/primitives/navbar";

describe("Navbar", () => {
  it("links the logo home", () => {
    render(<Navbar />);

    expect(screen.getByRole("link", { name: "Boutline" })).toHaveAttribute("href", "/");
  });

  it("calls onMenuClick from the menu button", () => {
    const onMenuClick = jest.fn();
    render(<Navbar onMenuClick={onMenuClick} />);

    const menu = screen.getByRole("button", { name: "Open menu" });
    fireEvent.click(menu);

    expect(menu).toHaveAttribute("type", "button");
    expect(onMenuClick).toHaveBeenCalledTimes(1);
  });
});
