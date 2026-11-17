import { render, screen } from "@testing-library/react";

import HomePage from "@/app/page";

describe("HomePage", () => {
  it("links only its two calls to action", () => {
    render(<HomePage />);

    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Find a tournament" })).toHaveAttribute(
      "href",
      "/tournaments",
    );
    expect(screen.getByRole("link", { name: "Run your tournament" })).toHaveAttribute(
      "href",
      "/admin",
    );
  });

  it("shows the ongoing events and a sample pool", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: "Ongoing Events" })).toBeInTheDocument();
    expect(screen.getByText("Junior Women's Foil")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Sample pool bouts" })).toBeInTheDocument();
  });
});
