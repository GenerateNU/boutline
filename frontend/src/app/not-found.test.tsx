import { render, screen } from "@testing-library/react";

import NotFound from "@/app/not-found";

describe("NotFound", () => {
  it("shows the logo and links back to the root", () => {
    render(<NotFound />);

    expect(screen.getByRole("img", { name: "Boutline logo" })).toHaveAttribute(
      "src",
      expect.stringContaining("logo.svg"),
    );
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
  });
});
