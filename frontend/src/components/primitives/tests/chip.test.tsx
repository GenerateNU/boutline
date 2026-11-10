import { render, screen } from "@testing-library/react";

import { Chip } from "@/components/primitives/chip";

describe("Chip", () => {
  it.each([
    { name: "static", props: {}, remove: false },
    { name: "dismissible", props: { dismissible: true }, remove: true },
    { name: "given onDismiss", props: { onDismiss: () => {} }, remove: true },
  ])("Remove button when $name", ({ props, remove }) => {
    render(<Chip {...props}>Foil</Chip>);

    expect(Boolean(screen.queryByRole("button", { name: "Remove" }))).toBe(remove);
  });
});
