import { render, screen } from "@testing-library/react";

import { NavbarTab } from "@/components/primitives/navbar-tab";

describe("NavbarTab", () => {
  it.each([
    { name: "active", active: true, current: "page", indicator: true },
    { name: "inactive", active: false, current: null, indicator: false },
  ])("when $name", ({ active, current, indicator }) => {
    render(<NavbarTab href="/fencers" label="Fencers" active={active} />);

    const tab = screen.getByRole("link", { name: "Fencers" });
    expect(tab).toHaveAttribute("href", "/fencers");
    expect(tab.getAttribute("aria-current")).toBe(current);
    expect(tab.querySelector("span[aria-hidden]")?.classList.contains("hidden")).toBe(!indicator);
  });
});
