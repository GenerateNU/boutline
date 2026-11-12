import { render, screen } from "@testing-library/react";

import { NavigationItem } from "@/components/primitives/navigation/navigation-item";

describe("NavigationItem", () => {
  it.each([
    { name: "active", surface: "dark", active: true, current: "page", indicator: true },
    { name: "inactive", surface: "dark", active: false, current: null, indicator: false },
    { name: "active", surface: "light", active: true, current: "page", indicator: true },
    { name: "inactive", surface: "light", active: false, current: null, indicator: false },
  ] as const)("when $name on $surface", ({ surface, active, current, indicator }) => {
    render(<NavigationItem href="/fencers" label="Fencers" active={active} surface={surface} />);

    const tab = screen.getByRole("link", { name: "Fencers" });
    expect(tab).toHaveAttribute("href", "/fencers");
    expect(tab.getAttribute("aria-current")).toBe(current);
    expect(tab.querySelector("span[aria-hidden]")?.classList.contains("hidden")).toBe(!indicator);
  });
});
