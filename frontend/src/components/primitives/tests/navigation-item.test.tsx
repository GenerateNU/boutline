import { render, screen } from "@testing-library/react";

import { NavigationItem } from "@/components/primitives/navigation/navigation-item";

describe("NavigationItem", () => {
  it.each([
    { name: "active", active: true, current: "page", indicator: true },
    { name: "inactive", active: false, current: null, indicator: false },
  ])("when $name", ({ active, current, indicator }) => {
    render(<NavigationItem href="/fencers" label="Fencers" active={active} />);

    const tab = screen.getByRole("link", { name: "Fencers" });
    expect(tab).toHaveAttribute("href", "/fencers");
    expect(tab.getAttribute("aria-current")).toBe(current);
    expect(tab.querySelector("span[aria-hidden]")?.classList.contains("hidden")).toBe(!indicator);
  });
});
