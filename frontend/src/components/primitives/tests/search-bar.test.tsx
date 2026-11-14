import { render, screen } from "@testing-library/react";

import { SearchBar } from "@/components/primitives/search-bar";

describe("SearchBar", () => {
  const cases = [
    { name: "expanded", expanded: true, visible: true },
    { name: "not expanded", expanded: false, visible: false },
    { name: "unfocused by default", expanded: undefined, visible: false },
  ];

  it.each(cases)("results slot when $name", ({ expanded, visible }) => {
    render(
      <SearchBar expanded={expanded} aria-label="Search">
        <p>Eric Kitagawa</p>
      </SearchBar>,
    );

    expect(screen.queryByText("Eric Kitagawa") !== null).toBe(visible);
  });
});
