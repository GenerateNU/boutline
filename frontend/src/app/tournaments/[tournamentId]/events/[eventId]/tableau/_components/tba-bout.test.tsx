import { render, screen } from "@testing-library/react";

import { DIMMED_OVERLAY } from "./dimmed-overlay";
import { TbaBout } from "./tba-bout";

describe("TbaBout", () => {
  it("shows TBA Location and a disabled, unpinned pin", () => {
    render(<TbaBout />);

    expect(screen.getByText("TBA Location")).toBeInTheDocument();
    const pin = screen.getByRole("button", { name: "Pin bout" });
    expect(pin).toBeDisabled();
    expect(pin).toHaveAttribute("aria-pressed", "false");
  });

  it("greys out with the same overlay as a regular bout, without fading", () => {
    render(<TbaBout dimmed />);

    const card = screen.getByRole("group", { name: "Bout to be announced" });
    expect(card).toHaveClass(...DIMMED_OVERLAY.split(" "));
    expect(card).not.toHaveClass("opacity-40");
  });

  it("isn't greyed out outside a search", () => {
    render(<TbaBout />);

    expect(
      screen.getByRole("group", { name: "Bout to be announced" }).className,
    ).not.toContain("after:bg-obsidian/20");
  });
});
