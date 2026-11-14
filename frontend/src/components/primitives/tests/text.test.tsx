import { render, screen } from "@testing-library/react";

import { Text } from "@/components/primitives/text";

describe("Text", () => {
  it.each([
    { as: undefined, variant: undefined, tag: "P", keyClass: "text-sm" },
    { as: "p", variant: "caption", tag: "P", keyClass: "text-neutral-secondary" },
    { as: "h1", variant: "title", tag: "H1", keyClass: "text-xl" },
    { as: "h2", variant: "title", tag: "H2", keyClass: "font-semibold" },
    { as: "h3", variant: "subtitle", tag: "H3", keyClass: "font-semibold" },
    { as: "p", variant: "muted", tag: "P", keyClass: "text-neutral-secondary" },
    { as: "p", variant: "body", tag: "P", keyClass: "text-obsidian" },
  ] as const)("renders $as with variant $variant", ({ as, variant, tag, keyClass }) => {
    render(
      <Text as={as} variant={variant}>
        Hello
      </Text>,
    );

    const text = screen.getByText("Hello");
    expect(text.tagName).toBe(tag);
    expect(text).toHaveClass(keyClass);
  });

  it("merges a caller class", () => {
    render(<Text className="uppercase">Hello</Text>);

    expect(screen.getByText("Hello")).toHaveClass("uppercase", "text-sm");
  });
});
