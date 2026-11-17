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

  // jsdom doesn't move focus on a label click, so check what the browser relies on: the box labels the input.
  it.each([
    { name: "a generated id", id: undefined },
    { name: "the caller's id", id: "pool-search" },
  ])("makes its whole box the input's label with $name", ({ id }) => {
    render(<SearchBar aria-label="Search" id={id} leading={<button type="button">Back</button>} />);
    const input = screen.getByRole("textbox", { name: "Search" });

    expect(input.closest("label")?.control).toBe(input);
    if (id) {
      expect(input).toHaveAttribute("id", id);
    }
  });
});
