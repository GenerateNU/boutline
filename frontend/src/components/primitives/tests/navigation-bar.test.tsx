import { render, screen } from "@testing-library/react";

import { NavigationBar } from "@/components/primitives/navigation/navigation-bar";

describe("NavigationBar", () => {
  it.each([
    { name: "a dark bar with an active tab", surface: "dark", active: true, indicator: true },
    { name: "a dark bar with no active tab", surface: "dark", active: false, indicator: false },
    { name: "a light bar", surface: "light", active: true, indicator: false },
  ] as const)("draws a shared indicator for $name", ({ surface, active, indicator }) => {
    render(
      <NavigationBar
        aria-label="Sections"
        surface={surface}
        items={[
          { label: "Overview", href: "/" },
          { label: "Fencers", href: "/fencers", active },
        ]}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Sections" });
    expect(!!nav.querySelector('[data-slot="navigation-indicator"]')).toBe(indicator);
  });

  it("staggers each tab's entrance from left to right", () => {
    render(
      <NavigationBar
        aria-label="Sections"
        items={[
          { label: "Overview", href: "/" },
          { label: "Fencers", href: "/fencers" },
          { label: "Clubs", href: "/clubs" },
        ]}
      />,
    );

    const delays = screen.getAllByRole("link").map((tab) => tab.style.animationDelay);
    expect(delays).toEqual(["0ms", "60ms", "120ms"]);
  });
});
