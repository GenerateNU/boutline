import { render, screen } from "@testing-library/react";

import { Logo } from "@/components/primitives/logo";

describe("Logo", () => {
  it.each([
    { name: "the default name and blue tone", props: {}, label: "Boutline", tone: "text-blue" },
    {
      name: "a given name and tone",
      props: { "aria-label": "Home", className: "text-white" },
      label: "Home",
      tone: "text-white",
    },
  ])("renders with $name", ({ props, label, tone }) => {
    render(<Logo {...props} />);

    const logo = screen.getByRole("img", { name: label });
    expect(logo).toHaveClass(tone);
  });
});
